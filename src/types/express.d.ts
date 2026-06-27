import "express";

// declare module "express-serve-static-core" {
//     interface Request {
//         requestId: string;
//     }
// }

declare global {
    namespace Express {
        interface Request {
            requestId: string;
        }
    }
}
