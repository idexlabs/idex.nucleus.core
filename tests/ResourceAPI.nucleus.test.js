"use strict";

const chai = require('chai');
const mocha = require('mocha');
const uuid = require('node-uuid');
const sinon = require('sinon');

const NucleusDatastore = require('../library/Datastore.nucleus');
const NucleusResource = require('../library/Resource.nucleus');
const NucleusResourceAPI = require('../library/ResourceAPI.nucleus');
const NucleusResourceRelationshipDatastore = require('../library/ResourceRelationshipDatastore.nucleus');

const DATASTORE_INDEX = 0;
const DATASTORE_URL = 'localhost';
const DATASTORE_PORT = 6379;

const resourceName = 'Dummy';

class DummyResourceModel extends NucleusResource {

  constructor (resourceAttributes, authorUserID) {
    super('Dummy', { name: 'string' }, resourceAttributes, {}, authorUserID);
  }

}

mocha.suite("Nucleus Resource API", function () {

  mocha.suiteSetup(function () {
    const $datastore = new NucleusDatastore('Test', {
      index: DATASTORE_INDEX,
      URL: DATASTORE_URL,
      port: DATASTORE_PORT
    });

    const $resourceRelationshipDatastore = new NucleusResourceRelationshipDatastore($datastore);

    Reflect.defineProperty(this, '$datastore', {
      value: $datastore,
      writable: false
    });

    Reflect.defineProperty(this, '$resourceRelationshipDatastore', {
      value: $resourceRelationshipDatastore,
      writable: false
    });

    return $datastore;
  });

  mocha.suiteSetup(function () {
    const $sandbox = sinon.createSandbox();

    Reflect.defineProperty(this, '$sandbox', {
      value: $sandbox,
      writable: false
    });
  });

  mocha.suiteSetup(function () {
    const { $datastore } = this;

    return $datastore.$$server.flushallAsync();
  });

  mocha.suiteTeardown(function () {
    const { $datastore } = this;

    return $datastore.$$server.flushallAsync();
  });

  mocha.suiteTeardown(function () {
    const { $datastore } = this;

    return $datastore.destroy();
  });

  mocha.teardown(function () {
    const { $sandbox } = this;

    $sandbox.reset();
  });

  mocha.suite("#create", function () {

    mocha.test.skip("The resource is created.", function () {
      const { $datastore, $resourceRelationshipDatastore, $sandbox } = this;

      const $resourceRelationshipDatastoreCreateRelationshipBetweenSubjectAndObjectSpy = $sandbox.stub();
      const $resourceRelationshipDatastoreRetrieveObjectOfRelationshipWithSubjectStub = $sandbox.stub();

      const resourceAttributes = {
        name: 'Dummy'
      };
      const authorUserID = uuid.v4();
      const groupID = uuid.v4();

      $resourceRelationshipDatastoreCreateRelationshipBetweenSubjectAndObjectSpy.returns(Promise.resolve);
      $resourceRelationshipDatastoreRetrieveObjectOfRelationshipWithSubjectStub.returns([ groupID ]);

      return NucleusResourceAPI.createResource.call({
        $datastore,
        $resourceRelationshipDatastore
      }, resourceName, DummyResourceModel, resourceAttributes, authorUserID)
        .then(({ resource, memberGroupID, authorUserID }) => {
          chai.expect(resource).to.have.property('ID');
          chai.expect(resource).to.have.property('meta');
          chai.expect(resource).to.have.property('type');
          chai.expect(resource.type).to.equal('Dummy');
          chai.expect(resource).to.be.deep.include({
            name: 'Dummy'
          });

          chai.expect(JSON.parse(JSON.stringify(resource)), "The resource is correctly converted to JSON and back.").to.deep.include(resource);

          chai.expect(memberGroupID).to.equal(groupID);

          chai.expect(authorUserID).to.equal(authorUserID);
        });
    });

  });

  mocha.suite("#removeByID", function () {

  });

  mocha.suite("Hierarchy tree", function () {

    mocha.suite("Simple direct branch", function () {

      mocha.setup(function () {
        const { $resourceRelationshipDatastore } = this;

        // Considering this list of ID, "SYSTEM" being the ancestor of nodeList[1] and so on and nodeList[3] being the leaf.
        const branchNodeIDList = ['SYSTEM', uuid.v4(), uuid.v4(), uuid.v4(), uuid.v4(), uuid.v4(),];

        Reflect.defineProperty(this, 'branchNodeIDList', {
          value: branchNodeIDList,
          writable: false
        });

        return Promise.all(branchNodeIDList
          .slice(0)
          .reverse()
          .map((nodeID, index, array) => {
            const ancestorNodeID = array[index + 1];

            if (!ancestorNodeID) return;

            $resourceRelationshipDatastore.createRelationshipBetweenSubjectAndObject(nodeID, 'is-member', ancestorNodeID);
          }));
      });

      mocha.teardown(function () {
        Reflect.deleteProperty(this, 'branchNodeIDList');
      });

      mocha.test("The four ancestor of our branch's leaf are retrieved in order of closeness.", async function () {
        const { $resourceRelationshipDatastore, branchNodeIDList } = this;

        const ancestorNodeIDList = await NucleusResourceAPI.walkHierarchyTreeUpward.call({ $resourceRelationshipDatastore }, branchNodeIDList[branchNodeIDList.length - 1]);

        chai.expect(ancestorNodeIDList).to.have.length(4);
        chai.expect(ancestorNodeIDList).to.deep.equal(branchNodeIDList.slice(0).reverse().splice(1, branchNodeIDList.length - 2));
      });

      mocha.test("The four children of our branch's knot are retrieved in order of closeness.", async function () {
        const { $resourceRelationshipDatastore, branchNodeIDList } = this;

        const childrenNodeIDList = await NucleusResourceAPI.walkHierarchyTreeDownward.call({ $resourceRelationshipDatastore }, branchNodeIDList[1]);

        chai.expect(childrenNodeIDList).to.have.length(4);
        chai.expect(childrenNodeIDList).to.deep.equal(branchNodeIDList.slice(0).splice(2, branchNodeIDList.length - 1));
      });

    });

    mocha.suite("Complex tree", function () {
      // Given this structure
      //
      // SYSTEM
      //   +
      //   +-> Group <1fb6d396-dd72-4943-9528-06db943d17d8>
      //   |    +
      //   |    +-> User <fcc66afe-3d80-4225-bd1f-7a34bd26f403>
      //   |    |
      //   |    +-> Resource <61fc9214-da8a-4426-8baf-b04565e87d4c>
      //   |    |
      //   |    +-> Group <bebffed5-d356-41d9-a4ed-32d33bba5127>
      //   |         +
      //   |         +-> Resource <0da2e0ec-02a1-4756-89f5-5bf2c2d3664a>
      //   |
      //   +-> Group <6db17cee-2bc8-48b1-901b-048935ba3d23>
      //   |    +
      //   |    +-> Group <cd910f16-6b3d-47cf-8711-8e4add5e8f4f>
      //   |         +
      //   |         +-> Resource <a7dc927f-9ebd-4d3b-8cf5-2ffea24bcf57>
      //   |
      //   +-> Group <caef15f7-58a0-4418-96c2-de211ff2496b>
      //        +
      //        +-> Resource <f76a418a-a4a4-41e8-8f68-99d6b1446bbd>
      //        |
      //        +-> Group <8dcb8309-7ade-4ff4-a6ba-97e5642391c0>
      //             +
      //             +-> User <87330246-ffee-4c87-aa5a-9232bca00132>

      mocha.setup(function () {
        const { $resourceRelationshipDatastore } = this;

        // Considering this list of ID, "SYSTEM" being the ancestor of nodeList[1] and so on and nodeList[3] being the leaf.
        const treeBranchList = [
          [ 'SYSTEM', '1fb6d396-dd72-4943-9528-06db943d17d8', 'bebffed5-d356-41d9-a4ed-32d33bba5127', '0da2e0ec-02a1-4756-89f5-5bf2c2d3664a' ],
          [ 'SYSTEM', '1fb6d396-dd72-4943-9528-06db943d17d8', '61fc9214-da8a-4426-8baf-b04565e87d4c' ],
          [ 'SYSTEM', '1fb6d396-dd72-4943-9528-06db943d17d8', 'fcc66afe-3d80-4225-bd1f-7a34bd26f403' ],
          [ 'SYSTEM', '6db17cee-2bc8-48b1-901b-048935ba3d23', 'cd910f16-6b3d-47cf-8711-8e4add5e8f4f', 'a7dc927f-9ebd-4d3b-8cf5-2ffea24bcf57' ],
          [ 'SYSTEM', 'caef15f7-58a0-4418-96c2-de211ff2496b', '8dcb8309-7ade-4ff4-a6ba-97e5642391c0', '87330246-ffee-4c87-aa5a-9232bca00132' ],
          [ 'SYSTEM', 'caef15f7-58a0-4418-96c2-de211ff2496b', 'f76a418a-a4a4-41e8-8f68-99d6b1446bbd' ]
        ];

        Reflect.defineProperty(this, 'treeBranchList', {
          value: treeBranchList,
          writable: false
        });

        return Promise.all(treeBranchList
          .slice(0)
          .map((branchNodeIDList) => {

            return Promise.all(branchNodeIDList
              .slice(0)
              .reverse()
              .map((nodeID, index, array) => {
                const ancestorNodeID = array[index + 1];

                if (!ancestorNodeID) return;

                $resourceRelationshipDatastore.createRelationshipBetweenSubjectAndObject(nodeID, 'is-member', ancestorNodeID);
              }));
          }));
      });

      mocha.teardown(function () {
        Reflect.deleteProperty(this, 'treeBranchList');
      });

      mocha.test("The two ancestors of the resource (0da2e0ec-02a1-4756-89f5-5bf2c2d3664a) are retrieved in order of closeness.", async function () {
        const { $resourceRelationshipDatastore } = this;

        const ancestorNodeIDList = await NucleusResourceAPI.walkHierarchyTreeUpward.call({ $resourceRelationshipDatastore }, '0da2e0ec-02a1-4756-89f5-5bf2c2d3664a');

        chai.expect(ancestorNodeIDList).to.have.length(2);
        chai.expect(ancestorNodeIDList).to.deep.equal([ 'bebffed5-d356-41d9-a4ed-32d33bba5127', '1fb6d396-dd72-4943-9528-06db943d17d8' ]);
      });

      mocha.test("The ancestor of the resource (61fc9214-da8a-4426-8baf-b04565e87d4c) is retrieved.", async function () {
        const { $resourceRelationshipDatastore } = this;

        const ancestorNodeIDList = await NucleusResourceAPI.walkHierarchyTreeUpward.call({ $resourceRelationshipDatastore }, '61fc9214-da8a-4426-8baf-b04565e87d4c');

        chai.expect(ancestorNodeIDList).to.have.length(1);
        chai.expect(ancestorNodeIDList).to.deep.equal([ '1fb6d396-dd72-4943-9528-06db943d17d8' ]);
      });

      mocha.test("The ancestor of the user (fcc66afe-3d80-4225-bd1f-7a34bd26f403) is retrieved.", async function () {
        const { $resourceRelationshipDatastore } = this;

        const ancestorNodeIDList = await NucleusResourceAPI.walkHierarchyTreeUpward.call({ $resourceRelationshipDatastore }, 'fcc66afe-3d80-4225-bd1f-7a34bd26f403');

        chai.expect(ancestorNodeIDList).to.have.length(1);
        chai.expect(ancestorNodeIDList).to.deep.equal([ '1fb6d396-dd72-4943-9528-06db943d17d8' ]);
      });

      mocha.test("The three childrens of the group (caef15f7-58a0-4418-96c2-de211ff2496b) are retrieved in order of closeness.", async function () {
        const { $resourceRelationshipDatastore } = this;

        const childrenNodeIDList = await NucleusResourceAPI.walkHierarchyTreeDownward.call({ $resourceRelationshipDatastore }, 'caef15f7-58a0-4418-96c2-de211ff2496b');

        chai.expect(childrenNodeIDList).to.have.length(3);
        chai.expect(childrenNodeIDList).to.deep.equal(['8dcb8309-7ade-4ff4-a6ba-97e5642391c0', 'f76a418a-a4a4-41e8-8f68-99d6b1446bbd', '87330246-ffee-4c87-aa5a-9232bca00132']);
      });

      mocha.test("The user (fcc66afe-3d80-4225-bd1f-7a34bd26f403) can retrieve the resource (61fc9214-da8a-4426-8baf-b04565e87d4c).", async function () {
        const { $resourceRelationshipDatastore } = this;

        const { canRetrieveResource } = await NucleusResourceAPI.verifyThatUserCanRetrieveResource.call({ $resourceRelationshipDatastore }, 'fcc66afe-3d80-4225-bd1f-7a34bd26f403', '61fc9214-da8a-4426-8baf-b04565e87d4c');

        chai.expect(canRetrieveResource).to.be.true;
      });

      mocha.test("The user (fcc66afe-3d80-4225-bd1f-7a34bd26f403) can retrieve the resource (0da2e0ec-02a1-4756-89f5-5bf2c2d3664a).", async function () {
        const { $resourceRelationshipDatastore } = this;

        const { canRetrieveResource } = await NucleusResourceAPI.verifyThatUserCanRetrieveResource.call({ $resourceRelationshipDatastore }, 'fcc66afe-3d80-4225-bd1f-7a34bd26f403', '0da2e0ec-02a1-4756-89f5-5bf2c2d3664a');

        chai.expect(canRetrieveResource).to.be.true;
      });

      mocha.test("The user (fcc66afe-3d80-4225-bd1f-7a34bd26f403) can not retrieve the resource (a7dc927f-9ebd-4d3b-8cf5-2ffea24bcf57).", async function () {
        const { $resourceRelationshipDatastore } = this;

        const { canRetrieveResource } = await NucleusResourceAPI.verifyThatUserCanRetrieveResource.call({ $resourceRelationshipDatastore }, 'fcc66afe-3d80-4225-bd1f-7a34bd26f403', 'a7dc927f-9ebd-4d3b-8cf5-2ffea24bcf57');

        chai.expect(canRetrieveResource).to.be.false;
      });

      mocha.test("The user (fcc66afe-3d80-4225-bd1f-7a34bd26f403) can update the resource (61fc9214-da8a-4426-8baf-b04565e87d4c).", async function () {
        const { $resourceRelationshipDatastore } = this;

        const { canUpdateResource } = await NucleusResourceAPI.verifyThatUserCanUpdateResource.call({ $resourceRelationshipDatastore }, 'fcc66afe-3d80-4225-bd1f-7a34bd26f403', '61fc9214-da8a-4426-8baf-b04565e87d4c');

        chai.expect(canUpdateResource).to.be.true;
      });

      mocha.test("The user (fcc66afe-3d80-4225-bd1f-7a34bd26f403) can update the resource (0da2e0ec-02a1-4756-89f5-5bf2c2d3664a).", async function () {
        const { $resourceRelationshipDatastore } = this;

        const { canUpdateResource } = await NucleusResourceAPI.verifyThatUserCanUpdateResource.call({ $resourceRelationshipDatastore }, 'fcc66afe-3d80-4225-bd1f-7a34bd26f403', '0da2e0ec-02a1-4756-89f5-5bf2c2d3664a');

        chai.expect(canUpdateResource).to.be.true;
      });

      mocha.test("The user (fcc66afe-3d80-4225-bd1f-7a34bd26f403) can not update the resource (a7dc927f-9ebd-4d3b-8cf5-2ffea24bcf57).", async function () {
        const { $resourceRelationshipDatastore } = this;

        const { canUpdateResource } = await NucleusResourceAPI.verifyThatUserCanUpdateResource.call({ $resourceRelationshipDatastore }, 'fcc66afe-3d80-4225-bd1f-7a34bd26f403', 'a7dc927f-9ebd-4d3b-8cf5-2ffea24bcf57');

        chai.expect(canUpdateResource).to.be.false;
      });

      mocha.test("The user (87330246-ffee-4c87-aa5a-9232bca00132) can not update the resource (f76a418a-a4a4-41e8-8f68-99d6b1446bbd).", async function () {
        const { $resourceRelationshipDatastore } = this;

        const { canUpdateResource } = await NucleusResourceAPI.verifyThatUserCanUpdateResource.call({ $resourceRelationshipDatastore }, '87330246-ffee-4c87-aa5a-9232bca00132', 'f76a418a-a4a4-41e8-8f68-99d6b1446bbd');

        chai.expect(canUpdateResource).to.be.false;
      });

    });

  });

});