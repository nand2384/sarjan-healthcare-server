import { AppError, ErrorCode } from "@errors";
import { LabRepository, EnterTestResultData } from "./lab.repository";

export class LabService {
    constructor(private readonly labRepository: LabRepository) {}

    public async getForDoctor(doctorStaffId: number, onlyPending: boolean) {
        return this.labRepository.findForDoctor(doctorStaffId, onlyPending);
    }

    public async enterResult(
        testOrderId: number,
        data: EnterTestResultData,
        staffId: number,
        restrictToDoctorStaffId?: number,
    ) {
        const order = await this.labRepository.findById(testOrderId);
        if (!order) {
            throw new AppError(404, ErrorCode.NOT_FOUND, "Test order not found");
        }

        // A doctor (no admin/receptionist access) may only enter results for
        // tests they ordered themselves, or tests tied to their own patients'
        // appointments — never another doctor's.
        if (restrictToDoctorStaffId !== undefined) {
            const isOrderer = order.ordered_by_staff_id === restrictToDoctorStaffId;
            const isTreatingDoctor = order.appointment?.doctor_staff_id === restrictToDoctorStaffId;
            if (!isOrderer && !isTreatingDoctor) {
                throw new AppError(403, ErrorCode.FORBIDDEN, "You can only enter results for your own patients' tests.");
            }
        }

        return this.labRepository.enterResult(testOrderId, data, staffId);
    }
}
