import fs from "fs";
import { gql } from "graphql-modules";
import { DocumentNode } from "graphql";

export function loadSchema(...files: string[]): DocumentNode[] {
    return files.map((file) => gql(fs.readFileSync(file).toString()));
}
