const memoryStore = {
    students: [
        {
            id: "admin",
            group: "Admin",
            firstName: "Admin",
            lastName: "",
            gender: "M",
            birthday: null,
            password: "ad123",
            role: "admin",
            status: "offline"
        },
        {
            id: "s1",
            group: "PZ-22",
            firstName: "Bohdan",
            lastName: "Karaziia",
            gender: "M",
            birthday: "2007-06-12",
            password: "2007-06-12",
            role: "student",
            status: "offline"
        },
        {
            id: "s2",
            group: "PZ-22",
            firstName: "Daryna",
            lastName: "Baranova",
            gender: "F",
            birthday: "2006-11-28",
            password: "2006-11-28",
            role: "student",
            status: "offline"
        }
    ],

    rooms: [
        {
            id: "room-admin-s1",
            name: "Admin",
            type: "direct",
            participants: ["admin", "s1"],
            createdBy: "admin",
            createdAt: new Date().toISOString()
        },
        {
            id: "room-admin-s2",
            name: "Admin",
            type: "direct",
            participants: ["admin", "s2"],
            createdBy: "admin",
            createdAt: new Date().toISOString()
        }
    ],

    messages: [],

    notifications: []
};

module.exports = memoryStore;