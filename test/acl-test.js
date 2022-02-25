var chai = require('chai')
var { ACL, ACE, ACLLoader } = require('../lib/util/acl');

describe('ACL', () => {
    it('authorize-dadget', () => {
        const loader = new ACLLoader()
        const acl = new ACL()

        /* READ TEST 1*/
        acl.setACE(loader._parseACL({
            acl:[{
                resource: {
                    path: "/db1",
                    type: "dadget"
                },
                name: "test-01",
                accesses: [{
                    operation: "READ"
                }]
            }]
        }))

        let inputs = [{
            req: {
                "method": "GET",
                "path": "/d/db1/subset/subset1/query?csn=0&query=%7B",
                "headers":{}
            },
            expect: true,
            name: "permit read access 1(GET)"
        },{
            req: {
                "method": "POST",
                "path": "/d/db1/subset/subset1/query/_get",
                "headers":{}
            },
            expect: true,
            name: "permit read access 2(POST)"
        },{
            req: {
                "method": "POST",
                "path": "/d/db1/subset/subset1/exec",
                "headers":{}
            },
            expect: false,
            name: "deny write access"
        }]

        inputs.forEach((i) => {
            let result = acl.authorizeByReq(i.req)
            chai.assert.isTrue(i.expect ? result.permit : !result.permit, i.name)
        })


        /* READ TEST 2*/
        acl.setACE(loader._parseACL({
            acl:[{
                resource: {
                    path: "/db1/subset1",
                    type: "dadget"
                },
                name: "test-02",
                accesses: [{
                    operation: "READ"
                }]
            }]
        }))

        inputs = [{
            req: {
                "method": "GET",
                "path": "/d/db1/subset/subset1/query?csn=0&query=%7B",
                "headers":{}
            },
            expect: true,
            name: "permit read access 1(GET)"
        },{
            req: {
                "method": "POST",
                "path": "/d/db1/subset/subset1/query/_get",
                "headers":{}
            },
            expect: true,
            name: "permit read access 2(POST)"
        },{
            req: {
                "method": "GET",
                "path": "/d/db1/subset/subset0/query?csn=0&query=%7B",
                "headers":{}
            },
            expect: false,
            name: "deny unexpected subset 1(GET)"
        },{
            req: {
                "method": "POST",
                "path": "/d/db1/subset/subset0/query/_get",
                "headers":{}
            },
            expect: false,
            name: "deny unexpected subset 2(POST)"
        },{
            req: {
                "method": "POST",
                "path": "/d/db1/subset/subset1/exec",
                "headers":{}
            },
            expect: false,
            name: "deny write access"
        }]

        inputs.forEach((i) => {
            let result = acl.authorizeByReq(i.req)
            chai.assert.isTrue(i.expect ? result.permit : !result.permit, i.name)
        })

        /* READ TEST 3 (regex path)*/
        acl.setACE(loader._parseACL({
            acl:[{
                resource: {
                    path: {
                        regex: "(/db2/subset[0-8]|/db1/subset[1-9])"
                    },
                    type: "dadget"
                },
                name: "test-03",
                accesses: [{
                    operation: "READ"
                }]
            }]
        }))

        inputs = [{
            req: {
                "method": "GET",
                "path": "/d/db1/subset/subset1/query?csn=0&query=%7B",
                "headers":{}
            },
            expect: true,
            name: "permit read access 1(GET)"
        },{
            req: {
                "method": "POST",
                "path": "/d/db1/subset/subset1/query/_get",
                "headers":{}
            },
            expect: true,
            name: "permit read access 2(POST)"
        },{
            req: {
                "method": "GET",
                "path": "/d/db1/subset/subset0/query?csn=0&query=%7B",
                "headers":{}
            },
            expect: false,
            name: "deny unexpected subset 1(GET)"
        },{
            req: {
                "method": "POST",
                "path": "/d/db1/subset/subset0/query/_get",
                "headers":{}
            },
            expect: false,
            name: "deny unexpected subset 2(POST)"
        },{
            req: {
                "method": "POST",
                "path": "/d/db1/subset/subset1/exec",
                "headers":{}
            },
            expect: false,
            name: "deny write access"
        }]

        inputs.forEach((i) => {
            let result = acl.authorizeByReq(i.req)
            chai.assert.isTrue(i.expect ? result.permit : !result.permit, i.name)
        })

        /* WRITE TEST */
        acl.setACE(loader._parseACL({
            acl:[{
                resource: {
                    path: {
                        regex: "/db1"
                    },
                    type: "dadget"
                },
                name: "test-11",
                accesses: [{
                    operation: "WRITE"
                }]
            }]
        }))

        inputs = [{
            req: {
                "method": "GET",
                "path": "/d/db1/subset/subset1/query?csn=0&query=%7B",
                "headers":{}
            },
            expect: false,
            name: "deny read access 1(GET)"
        },{
            req: {
                "method": "POST",
                "path": "/d/db1/subset/subset1/query/_get",
                "headers":{}
            },
            expect: false,
            name: "deny read access 2(POST)"
        },{
            req: {
                "method": "POST",
                "path": "/d/db1/subset/subset1/exec",
                "headers":{}
            },
            expect: true,
            name: "permit write access"
        }]

        inputs.forEach((i) => {
            let result = acl.authorizeByReq(i.req)
            chai.assert.isTrue(i.expect ? result.permit : !result.permit, i.name)
        })
        
        /* ANY TEST */
        acl.setACE(loader._parseACL({
            acl:[{
                resource: {
                    path: {
                        regex: "/db1"
                    },
                    type: "dadget"
                },
                name: "test-11",
                accesses: [{
                    operation: "*"
                }]
            }]
        }))

        inputs = [{
            req: {
                "method": "GET",
                "path": "/d/db1/subset/subset1/query?csn=0&query=%7B",
                "headers":{}
            },
            expect: true,
            name: "permit read access 1(GET)"
        },{
            req: {
                "method": "POST",
                "path": "/d/db1/subset/subset1/query/_get",
                "headers":{}
            },
            expect: true,
            name: "permit read access 2(POST)"
        },{
            req: {
                "method": "POST",
                "path": "/d/db1/subset/subset1/exec",
                "headers":{}
            },
            expect: true,
            name: "permit write access"
        }]

        inputs.forEach((i) => {
            let result = acl.authorizeByReq(i.req)
            chai.assert.isTrue(i.expect ? result.permit : !result.permit, i.name)
        })
    });

    it('authorize-application', () => {
        const loader = new ACLLoader()
        const acl = new ACL()

        /* READ TEST */
        acl.setACE(loader._parseACL({
            acl:[{
                resource: {
                    path: {
                        regex: "/app1/.*"
                    },
                    type: "application"
                },
                name: "app-01",
                accesses: [{
                    operation: "READ"
                }]
            }]
        }))

        let inputs = [{
            req: {
                "method": "GET",
                "path": "/a/app1/foo?csn=0&query=%7B",
                "headers":{}
            },
            expect: true,
            name: "permit read access"
        },{
            req: {
                "method": "GET",
                "path": "/a/app2/foo?csn=0&query=%7B",
                "headers":{}
            },
            expect: false,
            name: "deny unexpected app"
        },{
            req: {
                "method": "POST",
                "path": "/a/app1/foo?csn=0&query=%7B",
                "headers":{}
            },
            expect: false,
            name: "deny write access"
        }]

        inputs.forEach((i) => {
            let result = acl.authorizeByReq(i.req)
            chai.assert.isTrue(i.expect ? result.permit : !result.permit, i.name)
        })

        /* WRITE TEST */
        acl.setACE(loader._parseACL({
            acl:[{
                resource: {
                    path: {
                        regex: "/app1/.*"
                    },
                    type: "application"
                },
                name: "app-01",
                accesses: [{
                    operation: "WRITE"
                }]
            }]
        }))

        inputs = [{
            req: {
                "method": "GET",
                "path": "/a/app1/foo?csn=0&query=%7B",
                "headers":{}
            },
            expect: false,
            name: "deny read access"
        },{
            req: {
                "method": "GET",
                "path": "/a/app2/foo?csn=0&query=%7B",
                "headers":{}
            },
            expect: false,
            name: "deny unexpected app"
        },{
            req: {
                "method": "POST",
                "path": "/a/app1/foo?csn=0&query=%7B",
                "headers":{}
            },
            expect: true,
            name: "permit write access"
        },{
            req: {
                "method": "POST",
                "path": "/a/app2/foo?csn=0&query=%7B",
                "headers":{}
            },
            expect: false,
            name: "deny unexpected app"
        }]

        inputs.forEach((i) => {
            let result = acl.authorizeByReq(i.req)
            chai.assert.isTrue(i.expect ? result.permit : !result.permit, i.name)
        })

        /* ANY TEST */
        acl.setACE(loader._parseACL({
            acl:[{
                resource: {
                    path: {
                        regex: "/app1/.*"
                    },
                    type: "application"
                },
                name: "app-01",
                accesses: [{
                    operation: "*"
                }]
            }]
        }))

        inputs = [{
            req: {
                "method": "GET",
                "path": "/a/app1/foo?csn=0&query=%7B",
                "headers":{}
            },
            expect: true,
            name: "permit read access"
        },{
            req: {
                "method": "GET",
                "path": "/a/app2/foo?csn=0&query=%7B",
                "headers":{}
            },
            expect: false,
            name: "deny unexpected app"
        },{
            req: {
                "method": "POST",
                "path": "/a/app1/foo?csn=0&query=%7B",
                "headers":{}
            },
            expect: true,
            name: "permit write access"
        },{
            req: {
                "method": "POST",
                "path": "/a/app2/foo?csn=0&query=%7B",
                "headers":{}
            },
            expect: false,
            name: "deny unexpected app"
        }]

        inputs.forEach((i) => {
            let result = acl.authorizeByReq(i.req)
            chai.assert.isTrue(i.expect ? result.permit : !result.permit, i.name)
        })
    });

    it('subject test', () => {
        const loader = new ACLLoader()
        const acl = new ACL()

        /* SUBJECT TEST 1*/
        acl.setACE(loader._parseACL({
            acl:[{
                resource: {
                    path: {
                        regex: "/app1/.*"
                    },
                    type: "application"
                },
                name: "app-01",
                accesses: [{
                    subject: {
                        sub: "lalttest@lalttest.procube-demo.jp"
                    },
                    operation: "*"
                },{
                    subject: {
                        sub: {
                            regex: "^.*@lalttest.procube-demo.jp"
                        }
                    },
                    operation: "READ"
                }]
            }]
        }))

        /*
         * {"sub":"lalttest@lalttest.procube-demo.jp",
        "   exp":1960789678,
        "   nbf":1645429678,
        "   iat":1645429678}
         */
        const headers1 = {
            "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJsYWx0dGVzdEBsYWx0dGVzdC5wcm9jdWJlLWRlbW8uanAiLCJleHAiOjE5NjA3ODk2NzgsIm5iZiI6MTY0NTQyOTY3OCwiaWF0IjoxNjQ1NDI5Njc4fQ.TCBSd-hrr-M6rpL6n45OjGsY8J2gSnOI-m8XX6nQQjo"
        }
        /*
            {"sub":"foo@lalttest.procube-demo.jp",
            "exp":1961133038,
            "nbf":1645773038,
            "iat":1645773038}
        */
        const headers2 = {
            "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmb29AbGFsdHRlc3QucHJvY3ViZS1kZW1vLmpwIiwiZXhwIjoxOTYxMTMzMDM4LCJuYmYiOjE2NDU3NzMwMzgsImlhdCI6MTY0NTc3MzAzOH0.G6StTm2OjrXQEyfMtlljw2MvC9Y5z771wdjSrgDetIo"
        }

        /**
         * {"sub":"bar@unknown.procube-demo.jp",
         * "exp":1961139810,
         * "nbf":1645779810,
         * "iat":1645779810}
         */
        const headers3 = {
            "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiYXJAdW5rbm93bi5wcm9jdWJlLWRlbW8uanAiLCJleHAiOjE5NjExMzk4MTAsIm5iZiI6MTY0NTc3OTgxMCwiaWF0IjoxNjQ1Nzc5ODEwfQ.LZ_zaBsHowzgHkST7fG5HE6OpR00zHcJu2Q9T_OeHgg"
        }
        let inputs = [{
            req: {
                "method": "GET",
                "path": "/a/app1/foo?csn=0&query=%7B",
                headers: headers1
            },
            expect: true,
            name: "permit read access for user1"
        },{
            req: {
                "method": "POST",
                "path": "/a/app1/foo?csn=0&query=%7B",
                headers: headers1
            },
            expect: true,
            name: "permit write access for user1"
        },{
            req: {
                "method": "GET",
                "path": "/a/app1/foo?csn=0&query=%7B",
                headers: headers2
            },
            expect: true,
            name: "permit read access for user2"
        },{
            req: {
                "method": "POST",
                "path": "/a/app1/foo?csn=0&query=%7B",
                headers: headers2
            },
            expect: false,
            name: "deny write access for user2"
        },{
            req: {
                "method": "GET",
                "path": "/a/app1/foo?csn=0&query=%7B",
                headers: headers3
            },
            expect: false,
            name: "deny read access for user3"
        },{
            req: {
                "method": "POST",
                "path": "/a/app1/foo?csn=0&query=%7B",
                headers: headers3
            },
            expect: false,
            name: "deny write access for user3"
        }]

        inputs.forEach((i) => {
            let result = acl.authorizeByReq(i.req)
            chai.assert.isTrue(i.expect ? result.permit : !result.permit, i.name)
        })

        /* SUBJECT TEST 2 (multiple attribute)*/
        acl.setACE(loader._parseACL({
            acl:[{
                resource: {
                    path: {
                        regex: "/app1/.*"
                    },
                    type: "application"
                },
                name: "app-01",
                accesses: [{
                    subject: {
                        sub: {
                            regex: "^.*@lalttest.procube-demo.jp"
                        },
                        exp: "1960789678"
                    },
                    operation: "*"
                },{
                    subject: {
                        sub: {
                            regex: "^.*@lalttest.procube-demo.jp"
                        }
                    },
                    operation: "READ"
                }]
            }]
        }))

        inputs = [{
            req: {
                "method": "GET",
                "path": "/a/app1/foo?csn=0&query=%7B",
                headers: headers1
            },
            expect: true,
            name: "permit read access for user1"
        },{
            req: {
                "method": "POST",
                "path": "/a/app1/foo?csn=0&query=%7B",
                headers: headers1
            },
            expect: true,
            name: "permit write access for user1"
        },{
            req: {
                "method": "GET",
                "path": "/a/app1/foo?csn=0&query=%7B",
                headers: headers2
            },
            expect: true,
            name: "permit read access for user2"
        },{
            req: {
                "method": "POST",
                "path": "/a/app1/foo?csn=0&query=%7B",
                headers: headers2
            },
            expect: false,
            name: "deny write access for user2"
        }]

        inputs.forEach((i) => {
            let result = acl.authorizeByReq(i.req)
            chai.assert.isTrue(i.expect ? result.permit : !result.permit, i.name)
        })
    });
})