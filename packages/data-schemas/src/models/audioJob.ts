import { Model } from 'mongoose';
import { applyTenantIsolation } from '~/models/plugins/tenantIsolation';
import audioJobSchema from '~/schema/audioJob';
import type { IAudioJob } from '~/types/audioJob';

export function createAudioJobModel(mongoose: typeof import('mongoose')): Model<IAudioJob> {
  applyTenantIsolation(audioJobSchema);
  return mongoose.models.AudioJob || mongoose.model<IAudioJob>('AudioJob', audioJobSchema);
}
