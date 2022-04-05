const Voting = artifacts.require("Voting");
const { expect } = require('chai');
const { BN, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');

contract("Voting", accounts => {

    // define contract instance that will be run
    let instance;
    // define contract owner
    const owner = accounts[0];
    // define another account without any right (not owner, not voter)
    const randomGuy = accounts[1];
    // define 3 other accounts that will be allowed to vote
    const voters = [accounts[2], accounts[3], accounts[4]];
    // define 3 proposals that will be submitted by voters
    const proposals = ['Proposal #0', 'Proposal #1', 'Proposal #2'];
    // define an expected winning proposal ID
    const expectedWinnerId = proposals.length - 2;
    // define expected revert message using Ownable
    const ownableRevertMessage = "Ownable: caller is not the owner.";
    // define expected revert message using onlyVoters modifier
    const voterRevertMessage = "You're not a voter";

    describe('Contract initial state', () => {

        before(async () => instance = await Voting.new({ from: owner }));
        
        it('expects owner to be properly set', async () => {
            expect(await instance.owner({ from: owner })).to.equal(owner);
        });
        
        it('expects status to be `RegisteringVoters`', async () => {
            const status = await instance.workflowStatus.call({ from: owner });
            expect(new BN(status)).to.be.bignumber.equal(new BN(0));
        });

        it('expects proposals array to be empty', async () => {
            await instance.addVoter(voters[0], { from: owner });
            // tries to get first proposal in array
            await expectRevert.unspecified(instance.getOneProposal(new BN(0), { from: voters[0] }));
        });

        it('expects winningProposalID to be set to 0', async () => {
            const winningProposalID = await instance.winningProposalID.call({ from: owner });
            expect(new BN(winningProposalID)).to.be.bignumber.equal(new BN(0));
        });

    });
        
    describe('Workflow', () => {

        before(async () => instance = await Voting.new({ from: owner }));

        it('reverts if proposals registration is not started by the owner', async () => {
            await expectRevert(instance.startProposalsRegistering({ from: randomGuy }), ownableRevertMessage);
        });

        it('emits an event on proposals registration started', async () => {
            const changed = await instance.startProposalsRegistering({ from: owner });
            expectEvent(changed, "WorkflowStatusChange", { previousStatus: new BN(0), newStatus: new BN(1) });
        });
        
        it('reverts if status is not `RegisteringVoters` when owner starts proposals registration', async () => {
            await expectRevert(instance.startProposalsRegistering({ from: owner }), 'Registering proposals cant be started now');
        });
        
        it('reverts if proposals registration is not ended by the owner', async () => {
            await expectRevert(instance.endProposalsRegistering({ from: randomGuy }), ownableRevertMessage);
        });
        
        it('emits an event on proposals registration ended', async () => {
            const changed = await instance.endProposalsRegistering({ from: owner });
            expectEvent(changed, "WorkflowStatusChange", { previousStatus: new BN(1), newStatus: new BN(2) });
        });
        
        it('reverts if status is not `ProposalsRegistrationStarted` when owner ends proposals registration', async () => {
            await expectRevert(instance.endProposalsRegistering({ from: owner }), 'Registering proposals havent started yet');
        });
        
        it('reverts if voting session is not started by the owner', async () => {
            await expectRevert(instance.startVotingSession({ from: randomGuy }), ownableRevertMessage);
        });
        
        it('emits an event on voting session started', async () => {
            const changed = await instance.startVotingSession({ from: owner });
            expectEvent(changed, "WorkflowStatusChange", { previousStatus: new BN(2), newStatus: new BN(3) });
        });
        
        it('reverts if status is not `ProposalsRegistrationEnded` when owner starts voting session', async () => {
            await expectRevert(instance.startVotingSession({ from: owner }), 'Registering proposals phase is not finished');
        });
        
        it('reverts if voting session is not ended by the owner', async () => {
            await expectRevert(instance.endVotingSession({ from: randomGuy }), ownableRevertMessage);
        });
        
        it('emits an event on voting session ended', async () => {
            const changed = await instance.endVotingSession({ from: owner });
            expectEvent(changed, "WorkflowStatusChange", { previousStatus: new BN(3), newStatus: new BN(4) });
        });
        
        it('reverts if status is not `VotingSessionStarted` when the owner ends voting session', async () => {
            await expectRevert(instance.endVotingSession({ from: owner }), 'Voting session havent started yet');
        });
        
        it('reverts if votes are not tallied by the owner', async () => {
            await expectRevert(instance.tallyVotes({ from: randomGuy }), ownableRevertMessage);
        });
        
        it('emits an event on votes tallied', async () => {
            const changed = await instance.tallyVotes({ from: owner });
            expectEvent(changed, "WorkflowStatusChange", { previousStatus: new BN(4), newStatus: new BN(5) });
        });
        
        it('reverts if status is not `VotingSessionEnded` when owner tallies votes', async () => {
            await expectRevert(instance.tallyVotes({ from: owner }), 'Current status is not voting session ended');
        });
    });

    describe('Getter functions', () => {
        
        before(async () => {
            instance = await Voting.new({ from: owner });
            await instance.addVoter(voters[0], { from: owner });
            await instance.startProposalsRegistering({ from: owner });
            await instance.addProposal(proposals[0], { from: voters[0] });
        });
        
        it('reverts if a non voter account requests a voter', async () => {
            await expectRevert(instance.getVoter(voters[0], { from: randomGuy }), voterRevertMessage);
        });

        it('expects voter to be properly returned', async () => {
            const voter = await instance.getVoter(voters[0], { from: voters[0] });
            expect(voter.isRegistered).to.be.true;
        });
        
        it('reverts if a non voter account requests a proposal', async () => {
            await expectRevert(instance.getOneProposal(new BN(0), { from: randomGuy }), voterRevertMessage);
        });

        it('expects proposal to be properly returned', async () => {
            const proposal = await instance.getOneProposal(new BN(0), { from: voters[0] });
            expect(proposal.description).to.be.not.empty;
        });
    });

    describe('Voters registration', () => {
        
        before(async () => instance = await Voting.new({ from: owner }));
        
        it('reverts if voter is not submitted by the owner', async () => {
            await expectRevert(instance.addVoter(voters[0], { from: randomGuy }), ownableRevertMessage);
        });

        it('emits an event on voter registered', async () => {
            const registered = await instance.addVoter(voters[0], { from: owner });
            expectEvent(registered, "VoterRegistered", { voterAddress: voters[0] });
        });
        
        it('expects voter values to be properly registered', async () => {
            let voter = await instance.getVoter(voters[0], { from: voters[0] });
            expect(voter.isRegistered).to.be.true; 
            expect(voter.hasVoted).to.be.false; 
            expect(new BN(voter.votedProposalId)).to.be.bignumber.equal(new BN(0)); 
        });

        it('reverts if voter is already registered', async () => {
            await expectRevert(instance.addVoter(voters[0], { from: owner }), 'Already registered');
        });

        it('reverts if status is not `registeringVoters`', async () => {
            await instance.startProposalsRegistering({ from: owner });
            await expectRevert(instance.addVoter(voters[0], { from: owner }), 'Voters registration is not open yet');
        });
    });
      
    describe('Proposals registration', () => {
        
        before(async () => {
            instance = await Voting.new({ from: owner });
            await instance.addVoter(voters[0], { from: owner });
        });
        
        it('reverts if proposal is not submitted by a voter', async () => {
            await expectRevert(instance.addProposal(proposals[0], { from: randomGuy }), voterRevertMessage);
        });
        
        it('reverts if status is not `registeringProposals`', async () => {
            await expectRevert(instance.addProposal(proposals[0], { from: voters[0] }), 'Proposals are not allowed yet');
        });
        
        it('reverts if proposal is empty', async () => {
            await instance.startProposalsRegistering({ from: owner });
            await expectRevert(instance.addProposal("", { from: voters[0] }), 'Vous ne pouvez pas ne rien proposer');
        });
        
        it('emits an event on proposal registered', async () => {
            const registered = await instance.addProposal(proposals[0], { from: voters[0] });
            expectEvent(registered, "ProposalRegistered", { proposalId: new BN(0) });
        });
        
        it('expects proposal values to be properly registered', async () => {
            const proposal = await instance.getOneProposal(new BN(0), { from: voters[0] });
            expect(proposal.description).to.equal(proposals[0]);
            expect(new BN(proposal.voteCount)).to.be.bignumber.equal(new BN(0));
        });
    });
    
    describe('Votes registration', () => {
        
        before(async () => {
            instance = await Voting.new({ from: owner });
            // populate voters account
            for (const voter of voters) {
                await instance.addVoter(voter, { from: owner });                                
            }
            // starts proposals registration
            await instance.startProposalsRegistering({ from: owner });
            // populate a proposal for each voter
            for (let i = 0; i < proposals.length; i++) {
                await instance.addProposal(proposals[i], { from: voters[i] });
            }
            // ends proposals registration 
            await instance.endProposalsRegistering({ from: owner });
        });

        it('reverts if voting session has not started', async () => {
            await expectRevert(instance.setVote(new BN(expectedWinnerId), { from: voters[0] }), 'Voting session havent started yet');
        });

        it('reverts if vote is not submitted by a voter', async () => {
            await instance.startVotingSession({ from: owner });
            await expectRevert(instance.setVote(new BN(expectedWinnerId), { from: randomGuy }), voterRevertMessage);
        });

        it('reverts if vote does not match a proposal', async () => {
            // define a proposal ID outside the proposals array range
            const wrongId = proposals.length;
            await expectRevert.unspecified(instance.setVote(new BN(wrongId), { from: voters[0] }));
        });

        it('emits an event on vote registered', async () => {
            const registered = await instance.setVote(new BN(expectedWinnerId), { from: voters[0] });
            expectEvent(registered, "Voted", { voter: voters[0], proposalId: new BN(expectedWinnerId) });
        });

        it('expects voter choice to be updated', async () => {
            const voter = await instance.getVoter(voters[0], { from: voters[1] });
            expect(voter.hasVoted).to.be.true;
            expect(new BN(voter.votedProposalId)).to.be.bignumber.equal(new BN(expectedWinnerId));
        });
        
        it('expects proposal vote count to be updated', async () => {
            const proposal = await instance.getOneProposal(new BN(expectedWinnerId), { from: voters[0] });
            expect(new BN(proposal.voteCount)).to.be.bignumber.equal(new BN(1));
        });

        it('reverts if voter has already voted', async () => {
            await expectRevert(instance.setVote(new BN(expectedWinnerId), { from: voters[0] }), 'You have already voted');
        });
    });

    describe('Voting results', () => {
       
        before(async () => {
            instance = await Voting.new({ from: owner });            
            // populate 'voter' accounts
            for (const voter of voters) {
                await instance.addVoter(voter, { from: owner });
            }
            // starts proposals registration
            await instance.startProposalsRegistering({ from: owner });
            // populate a proposal for each voter
            for (let i = 0; i < proposals.length; i++) {
                await instance.addProposal(proposals[i], { from: voters[i] });
            }
            // ends proposals registration 
            await instance.endProposalsRegistering({ from: owner });
            // starts voting session 
            await instance.startVotingSession({ from: owner });
            // simulate every voter to vote for the expected winning proposal
            for (const voter of voters) {
                await instance.setVote(new BN(expectedWinnerId), { from: voter });
            }
            // closes voting session
            await instance.endVotingSession({ from: owner });
            // tallies votes
            await instance.tallyVotes({ from: owner });
        });

        it('expects expected winner to be returned', async () => {
            const winnerId = await instance.winningProposalID.call({ from: owner });
            expect(new BN(winnerId)).to.be.bignumber.equal(new BN(expectedWinnerId));
        });

        it('expects winner vote count to be correctly set', async () => {
            const proposal = await instance.getOneProposal(expectedWinnerId, { from: voters[0] });
            expect(new BN(proposal.voteCount)).to.be.bignumber.equal(new BN(voters.length));
        });

    });
});
