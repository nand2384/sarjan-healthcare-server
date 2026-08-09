import { Router } from "express";
import { appContext } from "app.context";
import { ClinicProfileController } from "@modules/clinic-profile/clinic-profile.controller";

// Mounted at /public alongside the existing publicReviewRouter (Express
// allows multiple routers on the same prefix) — this file is where every
// new public-facing, unauthenticated landing-page endpoint added by the
// dynamic-landing-page feature lives (clinic profile, doctors now; video
// categories/videos and availability join it in later phases).
export const publicRouter = Router();

const clinicProfileController = new ClinicProfileController(appContext.services.clinicProfileService);
const doctorService = appContext.services.doctorService;
const videoCategoryService = appContext.services.videoCategoryService;
const videoService = appContext.services.videoService;

publicRouter.get("/clinic-profile", clinicProfileController.getPublic);

publicRouter.get("/video-categories", async (_req, res) => {
    const categories = await videoCategoryService.getPublicCategories();
    return res.status(200).json({ success: true, data: categories });
});

publicRouter.get("/video-categories/:id/videos", async (req, res) => {
    const videos = await videoService.getPublicByCategoryId(Number(req.params.id));
    return res.status(200).json({ success: true, data: videos });
});

publicRouter.get("/doctors/hero", async (_req, res) => {
    const doctors = await doctorService.getPublicHeroDoctors();
    return res.status(200).json({ success: true, data: doctors });
});

publicRouter.get("/doctors/availability-today", async (_req, res) => {
    const availability = await doctorService.getPublicTodayAvailability();
    return res.status(200).json({ success: true, data: availability });
});

publicRouter.get("/doctors/:id/availability", async (req, res) => {
    const availability = await doctorService.getPublicWeekAvailability(Number(req.params.id));
    return res.status(200).json({ success: true, data: availability });
});

publicRouter.get("/doctors/:id", async (req, res) => {
    const doctor = await doctorService.getPublicDetail(Number(req.params.id));
    return res.status(200).json({ success: true, data: doctor });
});

publicRouter.get("/doctors", async (_req, res) => {
    const doctors = await doctorService.getPublicList();
    return res.status(200).json({ success: true, data: doctors });
});
