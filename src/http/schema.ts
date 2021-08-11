import { gql } from "apollo-server-express";

export default gql`
    scalar Date
    scalar JSON

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

    type Room {
        name: String!
        title: String
        icon: String
        description: String
        deviceCount: Int
    }

    type Group {
        name: String!
        title: String
        description: String
        type: String!
    }

    type TopicProvider {
        topic: String
        name: String
        format: String
    }

    type Topics {
        subscribers: [TopicProvider]
        publishers: [TopicProvider]
        polls: [String]
    }

    type Query {
        devices(filter: JSON): [Device]
        device(uid: ID!): Device!
        rooms(filter: JSON): [Room]
        room(name: String!): Room!
        topics(deviceUid: ID!): Topics!
    }

    type Mutation {
        setState(deviceUid: String!, newState: JSON!): Boolean
    }

    type Subscription {
        deviceUpdated: Device
    }
`;
