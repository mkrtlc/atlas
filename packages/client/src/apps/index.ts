import { appRegistry } from '../config/app-registry';
import { docsManifest } from './docs/manifest';
import { drawManifest } from './draw/manifest';
import { tasksManifest } from './tasks/manifest';
import { hrManifest } from './hr/manifest';
import { tablesManifest } from './tables/manifest';
import { driveManifest } from './drive/manifest';
import { signManifest } from './sign/manifest';
import { crmManifest } from './crm/manifest';

appRegistry.register(docsManifest);
appRegistry.register(drawManifest);
appRegistry.register(tasksManifest);
appRegistry.register(hrManifest);
appRegistry.register(tablesManifest);
appRegistry.register(driveManifest);
appRegistry.register(signManifest);
appRegistry.register(crmManifest);

export { appRegistry };
