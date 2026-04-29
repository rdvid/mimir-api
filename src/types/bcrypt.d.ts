declare module 'bcrypt' {
    const bcrypt: {
        hash(data: string, saltOrRounds: string | number): Promise<string>;
        compare(data: string, encrypted: string): Promise<boolean>;
    };

    export default bcrypt;
}
