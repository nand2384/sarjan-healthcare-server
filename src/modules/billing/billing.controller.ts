import { Request, Response } from "express";
import { BillingService } from "./billing.service";

export class BillingController {
    constructor(private readonly billingService: BillingService) {}

    // --- Test Catalog ---

    public getActiveTestCatalog = async (_req: Request, res: Response) => {
        const data = await this.billingService.getActiveTestCatalog();

        return res.status(200).json({
            message: "Fetched test catalog successfully.",
            data,
        });
    };

    public getAllAdminTestCatalog = async (_req: Request, res: Response) => {
        const data = await this.billingService.getAllAdminTestCatalog();

        return res.status(200).json({
            message: "Fetched test catalog successfully.",
            data,
        });
    };

    public createTestCatalog = async (req: Request, res: Response) => {
        const data = await this.billingService.createTestCatalog(req.body, req.auditContext);

        return res.status(201).json({
            message: "Test created successfully.",
            data,
        });
    };

    public updateTestCatalog = async (req: Request, res: Response) => {
        const id = Number(req.params.id);
        const data = await this.billingService.updateTestCatalog(id, req.body, req.auditContext);

        return res.status(200).json({
            message: "Test updated successfully.",
            data,
        });
    };

    public deleteTestCatalog = async (req: Request, res: Response) => {
        const id = Number(req.params.id);
        await this.billingService.deleteTestCatalog(id, req.auditContext);

        return res.status(200).json({
            message: "Test deleted successfully.",
        });
    };

    // --- Doctor Fees ---

    public getDoctorsWithFees = async (_req: Request, res: Response) => {
        const data = await this.billingService.getDoctorsWithFees();

        return res.status(200).json({
            message: "Fetched doctor fees successfully.",
            data,
        });
    };

    public updateDoctorFees = async (req: Request, res: Response) => {
        const staffId = Number(req.params.id);
        const data = await this.billingService.updateDoctorFees(staffId, req.body, req.auditContext);

        return res.status(200).json({
            message: "Doctor fees updated successfully.",
            data,
        });
    };
}
