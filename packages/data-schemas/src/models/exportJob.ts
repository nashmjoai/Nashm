import { Model } from 'mongoose';
import { applyTenantIsolation } from '~/models/plugins/tenantIsolation';
import exportJobSchema from '~/schema/exportJob';
import type { IExportJob } from '~/types/exportJob';

export function createExportJobModel(mongoose: typeof import('mongoose')): Model<IExportJob> {
  applyTenantIsolation(exportJobSchema);
  return mongoose.models.ExportJob || mongoose.model<IExportJob>('ExportJob', exportJobSchema);
}
