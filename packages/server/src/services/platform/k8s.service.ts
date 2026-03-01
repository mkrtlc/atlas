import * as k8s from '@kubernetes/client-node';
import { logger } from '../../utils/logger';
import type { AtlasManifest } from '@atlasmail/shared';

// ---------------------------------------------------------------------------
// K8s client (lazy — loads from cluster config or local kubeconfig)
// ---------------------------------------------------------------------------

let kc: k8s.KubeConfig | null = null;
let coreApi: k8s.CoreV1Api | null = null;
let appsApi: k8s.AppsV1Api | null = null;
let networkApi: k8s.NetworkingV1Api | null = null;
let customApi: k8s.CustomObjectsApi | null = null;

function getKubeConfig(): k8s.KubeConfig {
  if (!kc) {
    kc = new k8s.KubeConfig();
    try {
      kc.loadFromCluster();
    } catch {
      kc.loadFromDefault();
    }
  }
  return kc;
}

function getCoreApi(): k8s.CoreV1Api {
  if (!coreApi) coreApi = getKubeConfig().makeApiClient(k8s.CoreV1Api);
  return coreApi;
}

function getAppsApi(): k8s.AppsV1Api {
  if (!appsApi) appsApi = getKubeConfig().makeApiClient(k8s.AppsV1Api);
  return appsApi;
}

function getNetworkApi(): k8s.NetworkingV1Api {
  if (!networkApi) networkApi = getKubeConfig().makeApiClient(k8s.NetworkingV1Api);
  return networkApi;
}

function getCustomApi(): k8s.CustomObjectsApi {
  if (!customApi) customApi = getKubeConfig().makeApiClient(k8s.CustomObjectsApi);
  return customApi;
}

function isConflict(err: unknown): boolean {
  return (err as any)?.response?.statusCode === 409 || (err as any)?.statusCode === 409;
}
function isNotFound(err: unknown): boolean {
  return (err as any)?.response?.statusCode === 404 || (err as any)?.statusCode === 404;
}

// ---------------------------------------------------------------------------
// Namespace management
// ---------------------------------------------------------------------------

export async function createNamespace(namespace: string, quotaCpu: number, quotaMemoryMb: number, quotaStorageMb: number) {
  const core = getCoreApi();

  try {
    await core.createNamespace({
      body: { metadata: { name: namespace, labels: { 'atlas.so/managed': 'true' } } },
    } as any);
    logger.info({ namespace }, 'K8s namespace created');
  } catch (err) {
    if (!isConflict(err)) throw err;
    logger.debug({ namespace }, 'K8s namespace already exists');
  }

  try {
    await core.createNamespacedResourceQuota({
      namespace,
      body: {
        metadata: { name: 'tenant-quota', namespace },
        spec: {
          hard: {
            'requests.cpu': `${quotaCpu}m`,
            'requests.memory': `${quotaMemoryMb}Mi`,
            'requests.storage': `${quotaStorageMb}Mi`,
          },
        },
      },
    } as any);
  } catch (err) {
    if (!isConflict(err)) throw err;
  }

  const net = getNetworkApi();
  try {
    await net.createNamespacedNetworkPolicy({
      namespace,
      body: {
        metadata: { name: 'tenant-isolation', namespace },
        spec: {
          podSelector: {},
          policyTypes: ['Ingress', 'Egress'],
          ingress: [{
            _from: [{ namespaceSelector: { matchLabels: { 'atlas.so/role': 'ingress' } } }],
          }],
          egress: [
            { to: [{ namespaceSelector: { matchLabels: { 'atlas.so/role': 'addon-services' } } }] },
            { to: [{ namespaceSelector: {} }], ports: [{ protocol: 'UDP', port: 53 }, { protocol: 'TCP', port: 53 }] },
            { to: [{ ipBlock: { cidr: '0.0.0.0/0', except: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'] } }], ports: [{ protocol: 'TCP', port: 443 }] },
          ],
        },
      },
    } as any);
  } catch (err) {
    if (!isConflict(err)) throw err;
  }
}

export async function deleteNamespace(namespace: string) {
  const core = getCoreApi();
  try {
    await core.deleteNamespace({ name: namespace } as any);
    logger.info({ namespace }, 'K8s namespace deleted');
  } catch (err) {
    if (!isNotFound(err)) throw err;
  }
}

// ---------------------------------------------------------------------------
// App deployment
// ---------------------------------------------------------------------------

interface DeployAppOpts {
  namespace: string;
  deploymentName: string;
  manifest: AtlasManifest;
  envVars: Record<string, string>;
  installationId: string;
}

export async function deployApp(opts: DeployAppOpts) {
  const { namespace, deploymentName, manifest, envVars, installationId } = opts;
  const core = getCoreApi();
  const apps = getAppsApi();

  const labels = {
    'atlas.so/app': manifest.id,
    'atlas.so/installation': installationId,
  };

  // 1. Create Secret
  const secretName = `${deploymentName}-env`;
  const secretBody = {
    metadata: { name: secretName, namespace, labels },
    stringData: envVars,
  };
  try {
    await core.createNamespacedSecret({ namespace, body: secretBody } as any);
  } catch (err) {
    if (isConflict(err)) {
      await core.replaceNamespacedSecret({ name: secretName, namespace, body: secretBody } as any);
    } else {
      throw err;
    }
  }

  // 2. Create PVC
  const pvcName = `${deploymentName}-data`;
  if (manifest.persistentDirs.length > 0) {
    try {
      await core.createNamespacedPersistentVolumeClaim({
        namespace,
        body: {
          metadata: { name: pvcName, namespace, labels },
          spec: {
            accessModes: ['ReadWriteOnce'],
            resources: { requests: { storage: `${manifest.resources.storageMb}Mi` } },
          },
        },
      } as any);
    } catch (err) {
      if (!isConflict(err)) throw err;
    }
  }

  // 3. Create Deployment
  const deployment: k8s.V1Deployment = {
    metadata: { name: deploymentName, namespace, labels },
    spec: {
      replicas: 1,
      selector: { matchLabels: labels },
      template: {
        metadata: { labels },
        spec: {
          containers: [{
            name: 'app',
            image: manifest.runtime.image,
            ports: [{ containerPort: manifest.runtime.httpPort }],
            envFrom: [{ secretRef: { name: secretName } }],
            resources: {
              requests: {
                cpu: `${manifest.resources.cpuMillicores}m`,
                memory: `${manifest.resources.memoryMb}Mi`,
              },
              limits: {
                cpu: `${manifest.resources.cpuMillicores * 2}m`,
                memory: `${manifest.resources.memoryMb * 2}Mi`,
              },
            },
            readinessProbe: {
              httpGet: { path: manifest.runtime.healthCheckPath, port: manifest.runtime.httpPort as any },
              initialDelaySeconds: 10,
              periodSeconds: 15,
              timeoutSeconds: 5,
            },
            livenessProbe: {
              httpGet: { path: manifest.runtime.healthCheckPath, port: manifest.runtime.httpPort as any },
              initialDelaySeconds: 30,
              periodSeconds: 30,
              timeoutSeconds: 10,
            },
            volumeMounts: manifest.persistentDirs.map((dir, i) => ({
              name: 'data',
              mountPath: dir,
              subPath: `vol-${i}`,
            })),
          }],
          volumes: manifest.persistentDirs.length > 0
            ? [{ name: 'data', persistentVolumeClaim: { claimName: pvcName } }]
            : [],
        },
      },
    },
  };

  try {
    await apps.createNamespacedDeployment({ namespace, body: deployment } as any);
    logger.info({ namespace, deploymentName }, 'K8s deployment created');
  } catch (err) {
    if (isConflict(err)) {
      await apps.replaceNamespacedDeployment({ name: deploymentName, namespace, body: deployment } as any);
      logger.info({ namespace, deploymentName }, 'K8s deployment replaced');
    } else {
      throw err;
    }
  }

  // 4. Create Service
  const serviceName = `${deploymentName}-svc`;
  try {
    await core.createNamespacedService({
      namespace,
      body: {
        metadata: { name: serviceName, namespace, labels },
        spec: {
          selector: labels,
          ports: [{ port: manifest.runtime.httpPort, targetPort: manifest.runtime.httpPort as any, protocol: 'TCP' }],
          type: 'ClusterIP',
        },
      },
    } as any);
    logger.info({ namespace, serviceName }, 'K8s service created');
  } catch (err) {
    if (!isConflict(err)) throw err;
  }
}

// ---------------------------------------------------------------------------
// Traefik IngressRoute (CRD)
// ---------------------------------------------------------------------------

export async function createIngressRoute(opts: {
  namespace: string;
  installationId: string;
  hostname: string;
  serviceName: string;
  servicePort: number;
  tlsSecretName: string;
}) {
  const custom = getCustomApi();
  const routeName = `app-${opts.installationId.slice(0, 8)}`;

  const ingressRoute = {
    apiVersion: 'traefik.io/v1alpha1',
    kind: 'IngressRoute',
    metadata: { name: routeName, namespace: opts.namespace },
    spec: {
      entryPoints: ['websecure'],
      routes: [{
        match: `Host(\`${opts.hostname}\`)`,
        kind: 'Rule',
        services: [{ name: opts.serviceName, port: opts.servicePort }],
      }],
      tls: { secretName: opts.tlsSecretName },
    },
  };

  try {
    await custom.createNamespacedCustomObject({
      group: 'traefik.io',
      version: 'v1alpha1',
      namespace: opts.namespace,
      plural: 'ingressroutes',
      body: ingressRoute,
    } as any);
    logger.info({ hostname: opts.hostname }, 'Traefik IngressRoute created');
  } catch (err) {
    if (isConflict(err)) {
      await custom.replaceNamespacedCustomObject({
        group: 'traefik.io',
        version: 'v1alpha1',
        namespace: opts.namespace,
        plural: 'ingressroutes',
        name: routeName,
        body: ingressRoute,
      } as any);
    } else {
      throw err;
    }
  }
}

// ---------------------------------------------------------------------------
// Scale / restart
// ---------------------------------------------------------------------------

export async function scaleDeployment(namespace: string, deploymentName: string, replicas: number) {
  const apps = getAppsApi();
  await apps.patchNamespacedDeployment({
    name: deploymentName,
    namespace,
    body: { spec: { replicas } },
  } as any);
  logger.info({ namespace, deploymentName, replicas }, 'Deployment scaled');
}

export async function restartDeployment(namespace: string, deploymentName: string) {
  const apps = getAppsApi();
  await apps.patchNamespacedDeployment({
    name: deploymentName,
    namespace,
    body: {
      spec: {
        template: {
          metadata: {
            annotations: { 'atlas.so/restart': new Date().toISOString() },
          },
        },
      },
    },
  } as any);
  logger.info({ namespace, deploymentName }, 'Deployment restarted');
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

export async function checkDeploymentHealth(namespace: string, deploymentName: string): Promise<'healthy' | 'unhealthy' | 'unknown'> {
  const apps = getAppsApi();
  try {
    const deployment = await apps.readNamespacedDeployment({ name: deploymentName, namespace } as any) as any;
    const ready = deployment?.status?.readyReplicas ?? 0;
    const desired = deployment?.spec?.replicas ?? 1;
    return ready >= desired ? 'healthy' : 'unhealthy';
  } catch {
    return 'unknown';
  }
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

export async function deleteAppResources(namespace: string, deploymentName: string, installationId: string) {
  const core = getCoreApi();
  const apps = getAppsApi();
  const custom = getCustomApi();

  const routeName = `app-${installationId.slice(0, 8)}`;
  const secretName = `${deploymentName}-env`;
  const serviceName = `${deploymentName}-svc`;
  const pvcName = `${deploymentName}-data`;

  try { await custom.deleteNamespacedCustomObject({ group: 'traefik.io', version: 'v1alpha1', namespace, plural: 'ingressroutes', name: routeName } as any); } catch {}
  try { await core.deleteNamespacedService({ name: serviceName, namespace } as any); } catch {}
  try { await apps.deleteNamespacedDeployment({ name: deploymentName, namespace } as any); } catch {}
  try { await core.deleteNamespacedPersistentVolumeClaim({ name: pvcName, namespace } as any); } catch {}
  try { await core.deleteNamespacedSecret({ name: secretName, namespace } as any); } catch {}

  logger.info({ namespace, deploymentName }, 'K8s app resources deleted');
}
