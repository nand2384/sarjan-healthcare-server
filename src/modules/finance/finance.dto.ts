export interface DoctorFinanceBreakdownDto {
    staff_id: number;
    doctor_name: string;
    consultation_revenue: number;
    test_revenue: number;
    total_revenue: number;
    advance_count: number;
    walk_in_count: number;
    new_patient_count: number;
    returning_patient_count: number;
    cash_amount: number;
    card_amount: number;
    upi_amount: number;
}

export interface FinanceSummaryDto {
    total_revenue: number;
    total_consultations_billed: number;
    total_walk_ins: number;
    new_registrations: number;
    doctors: DoctorFinanceBreakdownDto[];
}

export interface DoctorPaymentItemDto {
    appointment_id: number;
    date: string;
    patient_name: string;
    receipt_no: string;
    total_amount: number;
    payment_method: string;
    patient_type: 'NEW' | 'OLD' | null;
}
