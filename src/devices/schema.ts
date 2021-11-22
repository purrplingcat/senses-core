import { gql } from "graphql-modules";

export default gql`
    enum TurnState {
        on
        off
        unknown
    }

    type DeviceInfo {
        product: String
        vendor: String
        model: String
        serialNumber: String
        revision: String
    }

    type Device {
        uid: ID!
        name: String
        type: String
        class: String
        title: String
        description: String
        room: String
        groups: [Group]
        info: DeviceInfo
        available: Boolean
        lastAlive: Date
        keepalive: Boolean
        lastUpdate: Date
        timeout: Int
        turnable: Boolean
        turn: TurnState
        state: JSON
        extraAttrs: JSON
        features: [String]
        tags: [String]
        via: ID
    }

    type Group {
        name: String!
        title: String
        description: String
        type: String!
    }

    extend type Query {
        devices(filter: JSON): [Device]
        device(uid: ID!): Device!
    }

    extend type Mutation {
        setState(deviceUid: String!, newState: JSON!): Boolean
    }

    extend type Subscription {
        deviceUpdated: Device
    }
`;
