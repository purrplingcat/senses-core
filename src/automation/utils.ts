import path from "path";

export async function loadFactory(p: string, factoryName: string): Promise<any> {
    if (factoryName.startsWith(".")) {
        throw Error("Illegal factory name");
    }

    return await import(path.join(p, factoryName));
}
