export class LabMapper {
    public static toDto(order: any) {
        return {
            test_order_id: order.test_order_id,
            test_name: order.test_catalog.test_name,
            patient_id: order.patient_id,
            patient_name: `${order.patient.first_name}${order.patient.middle_name ? ' ' + order.patient.middle_name : ''} ${order.patient.last_name}`,
            appointment_id: order.appointment_id,
            status: order.status,
            result_value: order.result_value,
            result_notes: order.result_notes,
            ordered_at: order.ordered_at.toISOString(),
            result_entered_at: order.result_entered_at ? order.result_entered_at.toISOString() : null,
        };
    }
}
