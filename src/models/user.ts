export interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  isAnonymous: false;
}

export interface AnonymousUser {
  uid: null;
  displayName: null;
  email: null;
  photoURL: null;
  isAnonymous: true;
}

export type CurrentUser = AppUser | AnonymousUser;
