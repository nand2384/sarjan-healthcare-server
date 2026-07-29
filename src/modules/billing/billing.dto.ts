export interface CreateTestCatalogDto {
    test_name: string;
    price: number;
    is_active?: boolean;
}

export interface UpdateTestCatalogDto {
    test_name?: string;
    price?: number;
    is_active?: boolean;
}

export interface UpdateDoctorFeesDto {
    old_case_fee: number;
    new_case_fee: number;
}

export type CheckoutPaymentMethod = "CASH" | "CARD" | "UPI";

export interface CheckoutDto {
    additional_test_catalog_ids: number[];
    payment_method: CheckoutPaymentMethod;
}
