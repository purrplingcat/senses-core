import { gql } from "apollo-server-express";

export default gql`
    scalar Date
    scalar JSON

    enum TurnState {
        on
        off
        unknown
    }

    type Device {
        uid: ID
        name: String
        type: String
        class: String
        title: String
        description: String
        room: String
        available: Boolean
        lastAlive: Date
        keepalive: Boolean
        timeout: Int
        turnable: Boolean
        turn: TurnState
        state: JSON
        extraAttrs: JSON
        features: [String]
        tags: [String]
        via: ID
    }

    type Query {
        devices(filter: JSON): [Device]
        device(uid: ID!): Device
    }

    type Subscription {
        deviceUpdated: Device
    }
`;
