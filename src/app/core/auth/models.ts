export interface CurrentAdmin {
  adminId: number;
  email: string;
  firstName: string;
  lastName: string;
}

export interface PlatformAuthResponse extends CurrentAdmin {
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}
