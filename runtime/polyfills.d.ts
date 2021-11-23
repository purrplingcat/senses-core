/* eslint-disable @typescript-eslint/no-unused-vars */

interface Array<T> {
    query(where: unknown): this;
}

namespace Reflect {
    function getPropertyNames(o: unknown): string[];
    function getAllMetadata(metadatakey: any, target: Object);
    function getConstructorOf(o: unknown): Function;
}
