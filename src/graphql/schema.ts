import { gql } from "graphql-modules";

export default gql`
    scalar Date
    scalar JSON

    type Query {
        name: String!
        version: String!
    }

    type Mutation
    type Subscription
`;
