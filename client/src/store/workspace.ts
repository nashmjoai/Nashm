import { atom } from 'recoil';

export const activeWorkspace = atom<string | null>({
  key: 'activeWorkspace',
  default: 'personal',
});

export default {
  activeWorkspace,
};
