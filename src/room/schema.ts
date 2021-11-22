import { gql } from "graphql-modules";

export default gql`
    type Room {
        name: String!
        title: String
        icon: String
        description: String
        deviceCount: Int
    }

    extend type Query {
        rooms(filter: JSON): [Room]
        room(name: String!): Room!
    }
`;
