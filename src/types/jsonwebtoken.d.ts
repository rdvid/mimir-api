declare module 'jsonwebtoken' {
    interface SignOptions {
        expiresIn?: string | number;
    }

    interface Jwt {
        sign(payload: object, secretOrPrivateKey: string, options?: SignOptions): string;
        verify(token: string, secretOrPublicKey: string): object | string;
    }

    const jwt: Jwt;

    export default jwt;
}
