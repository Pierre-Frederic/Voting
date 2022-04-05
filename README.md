# Unit tests for Voting.sol contract

Tests have been grouped into **7 sections** (each one responding to a functionnality):
* Contract initial state
* Workflow Controle
* Getter functions
* Voters registration
* Proposals registration
* Votes registration
* Voting results

Each section has it's proper scenario defined in a "before" hook.
It uses the variables defined at the very beginning of the file:
- 1 owner account
- 1 other account with no right to vote
- 3 voters account
- 3 proposals
- 1 of this proposals is expected to win

Tests are then realized by chronological order.

Each "it" statement has been explicitely described so that it's easy to understand what's expected.

A total of 42 passing tests is expected:

**Contract initial state** (4 tests)
```
✓ expects owner to be properly set
✓ expects status to be `RegisteringVoters`
✓ expects proposals array to be empty
✓ expects winningProposalID to be set to 0
```
**Workflow** (15 tests)
```
✓ reverts if proposals registration is not started by the owner
✓ emits an event on proposals registration started
✓ reverts if status is not `RegisteringVoters` when owner starts proposals registration
✓ reverts if proposals registration is not ended by the owner
✓ emits an event on proposals registration ended
✓ reverts if status is not `ProposalsRegistrationStarted` when owner ends proposals registration
✓ reverts if voting session is not started by the owner
✓ emits an event on voting session started
✓ reverts if status is not `ProposalsRegistrationEnded` when owner starts voting session
✓ reverts if voting session is not ended by the owner
✓ emits an event on voting session ended
✓ reverts if status is not `VotingSessionStarted` when the owner ends voting session
✓ reverts if votes are not tallied by the owner
✓ emits an event on votes tallied
✓ reverts if status is not `VotingSessionEnded` when owner tallies votes
```
**Getter functions** (4 tests)
```
✓ reverts if a non voter account requests a voter
✓ expects voter to be properly returned
✓ reverts if a non voter account requests a proposal
✓ expects proposal to be properly returned
```
**Voters registration** (5 tests)
```
✓ reverts if voter is not submitted by the owner
✓ emits an event on voter registered
✓ expects voter values to be properly registered
✓ reverts if voter is already registered
✓ reverts if status is not `registeringVoters`
```
**Proposals registration** (5 tests)
```
✓ reverts if proposal is not submitted by a voter
✓ reverts if status is not `registeringProposals`
✓ reverts if proposal is empty
✓ emits an event on proposal registered
✓ expects proposal values to be properly registered
```
**Votes registration** (7 tests)
```
✓ reverts if voting session has not started
✓ reverts if vote is not submitted by a voter
✓ reverts if vote does not match a proposal
✓ emits an event on vote registered
✓ expects voter choice to be updated
✓ expects proposal vote count to be updated
✓ reverts if voter has already voted
```
**Voting results** (2 tests)
```
✓ expects expected winner to be returned
✓ expects winner vote count to be correctly set
```
