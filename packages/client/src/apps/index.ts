import { appRegistry } from '../config/app-registry';
import { docsManifest } from './docs/manifest';
import { drawManifest } from './draw/manifest';
import { tasksManifest } from './tasks/manifest';
import { tablesManifest } from './tables/manifest';
import { driveManifest } from './drive/manifest';

appRegistry.register(docsManifest);
appRegistry.register(drawManifest);
appRegistry.register(tasksManifest);
appRegistry.register(tablesManifest);
appRegistry.register(driveManifest);

export { appRegistry };
