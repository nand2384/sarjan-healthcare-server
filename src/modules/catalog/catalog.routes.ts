import { Router } from "express";
import { appContext } from "app.context";
import { CatalogController } from "./catalog.controller";
import { authMiddleware, roleMiddleware, validate } from "@middleware";
import { getCatalogQuerySchema, createCatalogItemSchema, updateCatalogItemSchema } from "./catalog.schema";
import { USER_ROLE } from "common/common.schema";

export const catalogRouter = Router();

const catalogController = new CatalogController(appContext.services.catalogService);

const catalogRoles = roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.DOCTOR, USER_ROLE.LEAD_DOCTOR);

catalogRouter.get("/", authMiddleware, catalogRoles, validate(getCatalogQuerySchema, "query"), catalogController.getSuggestions);
catalogRouter.post("/", authMiddleware, catalogRoles, validate(createCatalogItemSchema), catalogController.addItem);
catalogRouter.patch("/:id", authMiddleware, catalogRoles, validate(updateCatalogItemSchema), catalogController.updateItem);
catalogRouter.delete("/:id", authMiddleware, catalogRoles, catalogController.deleteItem);
catalogRouter.post("/:id/dismiss", authMiddleware, catalogRoles, catalogController.dismiss);
catalogRouter.delete("/:id/dismiss", authMiddleware, catalogRoles, catalogController.undismiss);
