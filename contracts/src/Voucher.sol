// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import { FunctionsClient } from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import { FunctionsRequest } from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import { ConfirmedOwner } from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";

contract Voucher is ERC1155, AccessControl, ERC1155Burnable, ERC1155Supply, FunctionsClient, ConfirmedOwner {
    bytes32 public constant URI_SETTER_ROLE = keccak256("URI_SETTER_ROLE"); // funding entity
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE"); // student
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE"); // university

    using FunctionsRequest for FunctionsRequest.Request;
    bytes32 public donId = bytes32(0x66756e2d6176616c616e6368652d66756a692d31000000000000000000000000); 
    uint64 private subscriptionId = 13696; // Subscription ID for the Chainlink Functions
    uint32 private gasLimit; // Gas limit for the Chainlink Functions callbacks

    uint256 public MAX_SUPPLY;
    address public RECEIVING_UNIVERSITY;
    uint256 public STUDENT_ID;
    uint256 public VOUCHER_EXPIRATION;
    uint256 public GRADE_THRESHOLD;
    uint256 public ASSISTANCE_THRESHOLD;
    uint256 public status; //0 granted and inactive, 1 granted and in use, 2 out of supply, 3 expired, 4 deactivated
    uint256 public mintedSoFar;
    uint256 public averageGrade;
    uint256 public assistancePercentage;

    struct GradeAPIResponse {
        uint gradeAvg;
        bool passGradeThreshold;
        uint assistancePercentage;
        bool passAssistanceThreshold;
    }

    struct AssetPoolAPIResponse {
        uint256 balanceInUSD;
    }

    string private constant SOURCE_GRADES_INFO =
        "const id = args[0];"
        "const minGrade = args[1];"
        "const minAssistance = args[2];"
        "const currentGradeResponse = await Functions.makeHttpRequest({"
        "url: `https://vouch4edu.vercel.app/mock/grades/${id}?minGrade=${minGrade}&minAssistance=${minAssistance}/`,"
        "});"
        "if (currentGradeResponse.error) {"
        "throw new Error('Error getting student current grades');"
        "}"
        "const result = currentGradeResponse.data;"
        "return Functions.encodeString(result);";

    string private constant SOURCE_POOL_INFO =
        "const currentPoolResponse = await Functions.makeHttpRequest({"
        "url: `https://vouch4edu.vercel.app/pool/usd/`,"
        "});"
        "if (currentPoolResponse.error) {"
        "throw new Error('Error getting pool price');"
        "}"
        "const result = currentPoolResponse.data;"
        "return Functions.encodeString(result);";

    event RequestFailed(bytes error);

    constructor(address _defaultAdmin, address _minter, uint256 _maxSupply, address _university, uint256 _expiration, uint32 _gasLimit,
    uint256 _studentId, uint256 minGrade, uint256 minAssistance) 
        ERC1155("") FunctionsClient(address(0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0)) ConfirmedOwner(msg.sender) {
        require(_expiration > block.timestamp, "Expiration must be in the future");
        require(_maxSupply > 0, "Supply should be positive");
        _grantRole(DEFAULT_ADMIN_ROLE, _defaultAdmin);
        _grantRole(URI_SETTER_ROLE, _defaultAdmin);
        _grantRole(MINTER_ROLE, _minter);
        _grantRole(BURNER_ROLE, _university);

        MAX_SUPPLY = _maxSupply;
        RECEIVING_UNIVERSITY = _university;
        STUDENT_ID = _studentId;
        VOUCHER_EXPIRATION = _expiration;
        GRADE_THRESHOLD = minGrade;
        ASSISTANCE_THRESHOLD = minAssistance;
        gasLimit = _gasLimit;

        status = 0;
        mintedSoFar = 0;

    }

    function setURI(string memory newuri) public onlyRole(URI_SETTER_ROLE) {
        _setURI(newuri);
    }

    function mint(uint256 amount)
        public
        onlyRole(MINTER_ROLE)
    {
        require(mintedSoFar+amount < MAX_SUPPLY, "Not enough credits");
        if(mintedSoFar+amount == MAX_SUPPLY) status = 2;
        mintedSoFar += amount;
        if(status == 0) status = 1;
        _mint(RECEIVING_UNIVERSITY, STUDENT_ID, amount, "");
    }

    function burn(address owner, uint256 id, uint256 value)
        public
        override(ERC1155Burnable)
        onlyRole(BURNER_ROLE)
    {
        _burn(owner, id, value);
    }

    function checkStudentStatus() external {
        string[] memory args = new string[](3);
        args[0] = Strings.toString(STUDENT_ID);
        args[1] = Strings.toString(GRADE_THRESHOLD);
        args[2] = Strings.toString(ASSISTANCE_THRESHOLD);

        bytes32 requestId = _sendRequest(SOURCE_GRADES_INFO, args);

    }

    function _sendRequest(
        string memory source,
        string[] memory args
    ) internal returns (bytes32 requestId) {
        FunctionsRequest.Request memory req;
        req.initializeRequest(
            FunctionsRequest.Location.Inline,
            FunctionsRequest.CodeLanguage.JavaScript,
            source
        );
        if (args.length > 0) {
            req.setArgs(args);
        }
        requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            donId
        );
    }

    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        if (err.length > 0) {
            emit RequestFailed(err);
            return;
        }
        _processResponse(requestId, response);
    }

    function _processResponse(
        bytes32 requestId,
        bytes memory response
    ) private {
        // requests[requestId].response = string(response);

        // uint index = requests[requestId].index;
        // string memory tokenId = requests[requestId].tokenId;

        // // store: latest price for a given `tokenId`.
        // latestPrice[tokenId] = string(response);

        // // gets: houseInfo[tokenId]
        // House storage house = houseInfo[index];

        // // updates: listPrice for a given `tokenId`.
        // house.listPrice = string(response);
        // // updates: lastUpdate for a given `tokenId`.
        // house.lastUpdate = block.timestamp;

        // emit LastPriceReceived(requestId, string(response));
    }

    // The following functions are overrides required by Solidity.

    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override(ERC1155, ERC1155Supply)
    {
        super._update(from, to, ids, values);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}