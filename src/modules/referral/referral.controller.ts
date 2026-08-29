import { Request, Response } from "express";
import { ReferralService } from "./referral.service";
import { ReferralMapper } from "./referral.mapper";
import { AppError, ErrorCode } from "@errors";
import { USER_ROLE } from "common/common.schema";

export class ReferralController {
    constructor(private readonly referralService: ReferralService) {}

    public createReferral = async (req: Request, res: Response) => {
        const staffId = req.session?.staff_id;
        if (!staffId) {
            throw new AppError(401, ErrorCode.UNAUTHORIZED, "User not authenticated");
        }

        const roles = req.session?.roles ?? [];
        const isPrivileged = roles.includes(USER_ROLE.ADMIN);

        const referral = await this.referralService.createReferral(req.body, staffId, isPrivileged);
        return res.status(201).json({
            success: true,
            message: "Patient referred successfully.",
            data: ReferralMapper.toDto(referral),
        });
    };

    public revokeReferral = async (req: Request, res: Response) => {
        const staffId = req.session?.staff_id;
        if (!staffId) {
            throw new AppError(401, ErrorCode.UNAUTHORIZED, "User not authenticated");
        }
        const referralId = parseInt(req.params.id as string);
        if (isNaN(referralId)) {
            throw new AppError(400, ErrorCode.BAD_REQUEST, "Invalid referral ID");
        }

        const roles = req.session?.roles ?? [];
        const canRevokeAsPrivileged = roles.includes(USER_ROLE.ADMIN) || roles.includes(USER_ROLE.LEAD_DOCTOR);

        const referral = await this.referralService.revokeReferral(referralId, staffId, canRevokeAsPrivileged);
        return res.status(200).json({
            success: true,
            message: "Referral revoked.",
            data: referral,
        });
    };

    public getPatientReferrals = async (req: Request, res: Response) => {
        const staffId = req.session?.staff_id;
        if (!staffId) {
            throw new AppError(401, ErrorCode.UNAUTHORIZED, "User not authenticated");
        }
        const patientId = parseInt(req.params.patientId as string);
        if (isNaN(patientId)) {
            throw new AppError(400, ErrorCode.BAD_REQUEST, "Invalid patient ID");
        }

        const roles = req.session?.roles ?? [];
        const isPrivileged = roles.includes(USER_ROLE.ADMIN);

        const referrals = await this.referralService.getPatientReferrals(patientId, staffId, isPrivileged);
        return res.status(200).json({
            success: true,
            data: referrals.map(ReferralMapper.toDto),
        });
    };
}
