"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
const zod_1 = require("zod");
function validate(schema) {
    return (req, res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const messages = error.issues.map((issue) => {
                    const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
                    return `${path}${issue.message}`;
                });
                res.status(400).json({ error: 'Dados invalidos', details: messages });
                return;
            }
            next(error);
        }
    };
}
//# sourceMappingURL=validate.js.map