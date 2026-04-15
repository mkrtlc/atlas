import { appRegistry } from '../config/app-registry';
import { crmManifest } from './crm/manifest';
import { hrManifest } from './hr/manifest';
import { calendarManifest } from './calendar/manifest';
import { signManifest } from './sign/manifest';
import { driveManifest } from './drive/manifest';
import { docsManifest } from './docs/manifest';
import { drawManifest } from './draw/manifest';
import { invoicesManifest } from './invoices/manifest';
import { systemManifest } from './system/manifest';
import { workManifest } from './work/manifest';

appRegistry.register(crmManifest);
appRegistry.register(hrManifest);
appRegistry.register(calendarManifest);
appRegistry.register(signManifest);
appRegistry.register(driveManifest);
appRegistry.register(docsManifest);
appRegistry.register(drawManifest);
appRegistry.register(invoicesManifest);
appRegistry.register(systemManifest);
appRegistry.register(workManifest);

export { appRegistry };
