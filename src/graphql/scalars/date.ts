import { parseISO } from "date-fns";
import { GraphQLError, GraphQLScalarType, Kind } from "graphql";

const dateScalar = new GraphQLScalarType({
    name: "Date",
    description: "Date custom scalar type",
    serialize(value): number {
        if (value instanceof Date) {
            return value.getTime();
        }

        if (typeof value === "number") {
            return value;
        }

        return parseISO(String(value)).getTime();
    },
    parseValue(value) {
        if (value instanceof Date) {
            return value;
        }

        if (typeof value === "number") {
            return new Date(value);
        }

        return parseISO(String(value));
    },
    parseLiteral(ast) {
        if (ast.kind !== Kind.INT) {
            throw new GraphQLError(`Can't validate non-integer type '${ast.kind}' as Date`);
        }

        return new Date(parseInt(ast.value, 10));
    },
});

export default dateScalar;
