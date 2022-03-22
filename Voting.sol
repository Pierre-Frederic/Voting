// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.13;

// importe le contract Ownable de Openzeppelin
import "@openzeppelin/contracts/access/Ownable.sol";
// importe la librairie Strings de Openzeppelin
import "@openzeppelin/contracts/utils/Strings.sol";

contract Voting is Ownable {

    using Strings for uint;

    // liste des événements liés au déroulement du vote
    event WorkflowStatusChange(WorkflowStatus _previousStatus, WorkflowStatus _newStatus);    
    event VoterRegistered(address _voterAddress); 
    event ProposalRegistered(uint _proposalId);
    event Voted(address _voter, uint _proposalId);

    // énumération des étapes du processus de vote
    enum WorkflowStatus {
        RegisteringVoters,
        ProposalsRegistrationStarted,
        ProposalsRegistrationEnded,
        VotingSessionStarted,
        VotingSessionEnded,
        VotesTallied
    }

    // structure qui définit un votant
    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint votedProposalId;
    }

    // structure qui définit une proposition    
    struct Proposal {
        string description;
        uint voteCount;
    }

    // mapping qui référence les adresses autorisées à participer au vote
    mapping(address => Voter) private voters;
    
    // variable qui décompte le nbr total d'adresses enregistrées
    uint private votersNbr;

    // tableau qui référence l'ensemble des propositions
    // l'index sera utilisé comme proposalId
    Proposal[] private proposals;

    // tableau qui stocke la ou les propositions gagnantes
    uint[] private winners;

    // initialise le statut du vote à RegisteringVoters
    WorkflowStatus private voteStatus;

    // au déployement du contract, l'adresse de l'administrateur 
    // est enregistrée automatiquement dans la liste des votants
    constructor() {
        registerVoter(msg.sender);
    }

    // modifier qui vérifie si une adresse est enregistrée
    modifier onlyRegistered() {
        require(voters[msg.sender].isRegistered, unicode"Vous n'êtes pas enregistré");
        _;
    }

    // fonction qui met à jour le statut du vote et émet l'événement lié
    function updateVoteStatus(WorkflowStatus _newStatus) private {
        // vérifie que les étapes sont appelées dans l'ordre chronologique
        require(uint8(_newStatus)-uint8(voteStatus) == 1, unicode"Veuillez suivre les étapes dans l'ordre");
        WorkflowStatus previousStatus = voteStatus;
        voteStatus = _newStatus;
        emit WorkflowStatusChange(previousStatus, voteStatus);
    }

    // fonction qui permet à l'administrateur d'ouvrir les candidatures
    function startProposalsRegistration() public onlyOwner {
        // vérifie que d'autres votants sont inscrits
        require(votersNbr > 1, unicode"Vous êtes le seul inscrit à ce vote");
        updateVoteStatus(WorkflowStatus.ProposalsRegistrationStarted);
    }

    // fonction qui permet à l'administrateur de clore les candidatures
    function endProposalsRegistration() public onlyOwner {
        // vérifie qu'au moins une proposition a été enregistrée
        require(proposals.length > 0, unicode"Aucune proposition n'a été enregistrée");
        updateVoteStatus(WorkflowStatus.ProposalsRegistrationEnded);
    }

    // fonction qui permet à l'administrateur d'ouvrir les votes
    function startVotingSession() public onlyOwner {
        updateVoteStatus(WorkflowStatus.VotingSessionStarted);
    }

    // fonction qui permet à l'administrateur de clore les votes
    function endVotingSession() public onlyOwner {
        // verifie qu'il y a eu au moins un vote
        uint votesNbr = 0;
        for(uint id = 0; id < proposals.length; id++){
            votesNbr += proposals[id].voteCount;
        }
        if(votesNbr == 0){
            revert(unicode"Aucun vote n'a été enregistré");
        }
        updateVoteStatus(WorkflowStatus.VotingSessionEnded);
    }

    // fonction qui permet à l'administrateur d'ajouter un participant
    function registerVoter(address _address) public onlyOwner {
        // vérifie que l'adminisatreur peut encore ajouter des participants
        require(voteStatus == WorkflowStatus.RegisteringVoters, unicode"L'enregistrement des participants est terminé");
        // vérifie que l'adresse n'a pas déjà été enregistrée
        require(!voters[_address].isRegistered, unicode"Cette adresse a déjà été enregistrée");
        voters[_address] = Voter(true, false, 0);
        votersNbr++;
        emit VoterRegistered(_address);
    }

    // fonction qui permet à un participant de soumettre une proposition
    function submitProposal(string calldata _proposal) public onlyRegistered {
        // vérifie que la période de proposition est ouverte
        require(voteStatus == WorkflowStatus.ProposalsRegistrationStarted, "L'enregistrement des propositions n'est pas ouvert");
        // vérifie qu'une proposition a bien été redigée
        require(keccak256(abi.encodePacked((_proposal))) != keccak256(abi.encodePacked((""))), unicode"Veuillez rédiger une proposition");
        // enregistre la proposition
        proposals.push(Proposal(_proposal, 0));
        emit ProposalRegistered(proposals.length - 1);
    }

    // fonction qui retourne la description d'une proposition
    function getProposalDescription(uint _proposalId) private view returns (string memory) {
        return string(abi.encodePacked("#", _proposalId.toString(), " : ", proposals[_proposalId].description));
    }

    // fonction qui permet aux votants de voir les propositions
    function getProposals() public view onlyRegistered returns (string[] memory) {
        // verifie que l'enregistrement des propositions est ouvert
        require(uint8(voteStatus) > 0, 'Les propositions ne sont pas encore disponibles');
        string[] memory proposalDescriptions = new string[](proposals.length);
        for(uint i = 0; i < proposals.length; i++){
            proposalDescriptions[i] = getProposalDescription(i);
        }
        return proposalDescriptions;
    }

    // fonction qui enregistre le vote d'un participant
    function vote(uint _proposalId) public onlyRegistered {
        // vérifie que la période de vote est ouverte
        require(voteStatus == WorkflowStatus.VotingSessionStarted, "Les votes ne sont pas ouverts");
        // vérifie que _proposalId correspond à une proposition
        require(_proposalId < proposals.length, "Cette proposition n'existe pas");
        // si la personne avait déjà voté, on soustrait l'ancien vote
        if(voters[msg.sender].hasVoted){
            proposals[voters[msg.sender].votedProposalId].voteCount--;
        }
        // on comptabilise le nouveau vote
        voters[msg.sender].votedProposalId = _proposalId;
        proposals[voters[msg.sender].votedProposalId].voteCount++;
        voters[msg.sender].hasVoted = true;
        emit Voted(msg.sender, _proposalId);
    }

    // fonction qui compte les votes et détermine les propositions gagnantes
    function countVotes() public onlyOwner {
        // vérifie que la période de vote est terminée
        require(voteStatus == WorkflowStatus.VotingSessionEnded, unicode"Le vote n'est pas encore clos");
        // variable qui stocke le seuil de votes à attendre pour gagner
        uint maxVoteCount = 1;
        // boucle sur l'ensemble des propositions pour déterminer la ou les gagnantes
        for(uint id = 0; id < proposals.length; id++){
            // ajoute la proposition aux gagnantes si le seuil est atteint ou dépassé
            if(proposals[id].voteCount >= maxVoteCount){
                // retire les propositions gagnantes précédentes
                // si le seuil est dépassé
                if(proposals[id].voteCount > maxVoteCount){
                    for(uint i = winners.length; i > 0; i--){
                        winners.pop();
                    }
                }
                winners.push(id);
                // met à jour le seuil
                maxVoteCount = proposals[id].voteCount;                
            }
        }
        // modifie le statut du vote
        updateVoteStatus(WorkflowStatus.VotesTallied);
    }

    // fonction qui retourne le vote d'un participant
    function getVoteByAddress(address _address) public view returns (string memory) {
        require(voters[_address].isRegistered, unicode"Cette adresse n'est pas enregistrée");
        if(voters[_address].hasVoted){
            return getProposalDescription(voters[_address].votedProposalId);
        } else {
            return unicode'Aucun vote enregistré pour cette adresse';
        }
    }

    // fonction qui renvoie la ou les propositions gagnantes ainsi que le détails
    function getWinner() public view returns (string memory, string[] memory) {
        require(voteStatus == WorkflowStatus.VotesTallied, unicode"Les votes n'ont pas encore été décomptés");
        string memory result;
        string[] memory winnerDescriptions = new string[](winners.length);
        for (uint i = 0; i < proposals.length; i++) {
            winnerDescriptions[i] = getProposalDescription(i);
        }
        if (winners.length == 1) {
            result = string(abi.encodePacked("La proposition gagnante est ", getProposalDescription(winners[0])));
        } else {
            result = 'Plusieurs propositions sont ex-aequo.';
        }
        return (result, winnerDescriptions);
    }

}
