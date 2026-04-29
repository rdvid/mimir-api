import multer from 'multer';
import type { Request } from 'express';

interface UploadedFileLike {
    originalname: string;
}

const storage = multer.diskStorage({
    destination: function (
        _req: Request,
        _file: UploadedFileLike,
        cb: (error: Error | null, destination: string) => void,
    ): void {
        cb(null, './public/uploads');
    },
    filename: function (
        _req: Request,
        file: UploadedFileLike,
        cb: (error: Error | null, filename: string) => void,
    ): void {
        cb(null, file.originalname);
    },
});

export const upload = multer({ storage });
