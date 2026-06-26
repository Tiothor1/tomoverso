export const MARKETPLACE_FEE_BASIS_POINTS = 1000; // 10%
export const MIN_WITHDRAWAL_CENTS = 5000; // R$ 50,00
export const MIN_PAID_WORK_PRICE_CENTS = 490; // R$ 4,90
export const SETTLEMENT_DELAY_DAYS = 7;
export const MARKETPLACE_SUPPORT_EMAIL = "support@tomoverso.com";

export const SELLER_STATUS = ["draft", "pending", "approved", "rejected", "suspended"] as const;
export const PIX_KEY_TYPES = ["cpf", "cnpj", "email", "phone", "random"] as const;

export type SellerStatus = (typeof SELLER_STATUS)[number];
export type PixKeyType = (typeof PIX_KEY_TYPES)[number];
