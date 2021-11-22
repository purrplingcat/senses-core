import { createModule, gql } from "graphql-modules";
import Device from "./Device";

const typeDefs = gql`
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

    type Query {
        devices(filter: JSON): [Device]
        device(uid: ID!): Device!
    }

    type Mutation {
        setState(deviceUid: String!, newState: JSON!): Boolean
    }

    type Subscription {
        deviceUpdated: Device
    }
`;

export default createModule({
    id: "device",
    typeDefs,
    dirname: __dirname,
    resolvers: {
        Query: {
            device: (_: never, args: any, context: any) => {
                return null;
                return context.senses.devices.find((d: Device) => d.uid === args.uid);
            },
            devices: (_: never, args: any, context: any) => {
                const shouldBeFiltered = Boolean(args.filter);
                let devices = context.senses.devices;

                if (shouldBeFiltered) {
                    devices = devices.query(args.filter);
                }

                return devices;
            },
        },
    },
});
