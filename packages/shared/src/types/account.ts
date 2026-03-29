export interface Account {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  pictureUrl: string | null;
  provider: 'password';
  providerId: string;
  createdAt: string;
  updatedAt: string;
}
