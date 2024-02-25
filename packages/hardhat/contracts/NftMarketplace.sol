//SPDX-License-Identifier : MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

error NftMarketplace_PriceMustBeAboveZero();
error NftMarketplace_NotApproveForMarketplace();
error NftMarketplace_NotOwner();
error NftMarketplace_AlreadyListed();
error NftMarketplace_NotListed();

contract NftMarketplace is ReentrancyGuard {
    //event
    event listedSuccessfully(
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price,
        address indexed seller
    );
    event ItemBought(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );
    event DelistedSuccessfully(
        address indexed nftAddress,
        uint256 indexed tokenId,
        address indexed seller
    );

    struct Listing {
        uint256 price;
        address seller;
    }

    //mapping
    mapping(address => mapping(uint256 => Listing)) private nftRecords;
    mapping(address => uint256) private proceed;

    modifier isOwner(
        address nftAddress,
        uint256 tokenId,
        address spender
    ) {
        IERC721 nft = IERC721(nftAddress);
        address owner = nft.ownerOf(tokenId);
        if (owner != spender) {
            revert NftMarketplace_NotOwner();
        }
        _;
    }

    modifier alreadyListed(address nftAddress, uint256 tokenId) {
        Listing memory listing = nftRecords[nftAddress][tokenId];
        if (listing.price <= 0) {
            revert NftMarketplace_NotListed();
        }
        _;
    }

    modifier notListed(address nftAddress, uint256 tokenId) {
        Listing memory listing = nftRecords[nftAddress][tokenId];
        if (listing.price > 0) {
            revert NftMarketplace_AlreadyListed();
        }
        _;
    }

    // listitem: list nft on the marketplace
    function listItem(
        address nftAddress,
        uint256 tokenId,
        uint256 price
    ) external notListed(nftAddress, tokenId) isOwner(nftAddress, tokenId, msg.sender) {
        if (price <= 0) {
            revert NftMarketplace_PriceMustBeAboveZero();
        }
        IERC721 nft = IERC721(nftAddress);
        if (nft.getApproved(tokenId) != address(this)) {
            revert NftMarketplace_NotApproveForMarketplace();
        }
        nftRecords[nftAddress][tokenId] = Listing(price, msg.sender);
        emit listedSuccessfully(nftAddress, tokenId, price, msg.sender);
    }

    //buyitem: buy nft on the marketplace
    function buyItem(
        address nftAddress,
        uint256 tokenId
    ) external payable alreadyListed(nftAddress, tokenId) nonReentrant {
        Listing memory listing = nftRecords[nftAddress][tokenId];

        require(msg.value >= listing.price, " not enough ETH send");

        proceed[listing.seller] = proceed[listing.seller] + msg.value;
        delete (nftRecords[nftAddress][tokenId]);
        IERC721(nftAddress).safeTransferFrom(listing.seller, msg.sender, tokenId);
        emit ItemBought(msg.sender, nftAddress, tokenId, listing.price);
    }

    function cancelListing(
        address nftAddress,
        uint256 tokenId
    ) external alreadyListed(nftAddress, tokenId) isOwner(nftAddress, tokenId, msg.sender) {
        delete (nftRecords[nftAddress][tokenId]);
        // IERC721(nftAddress).setApprovalForAll(msg.sender, "0x0");
        emit DelistedSuccessfully(nftAddress, tokenId, msg.sender);
    }

    function updateListing(
        address nftAddress,
        uint256 tokenId,
        uint256 newPrice
    ) external alreadyListed(nftAddress, tokenId) isOwner(nftAddress, tokenId, msg.sender) {
        nftRecords[nftAddress][tokenId].price = newPrice;
        emit listedSuccessfully(nftAddress, tokenId, newPrice, msg.sender);
    }

    function withdrawProceed() external nonReentrant {
        require(proceed[msg.sender] != 0, "can't withdraw 0 proceed");
        uint256 amount = proceed[msg.sender];
        proceed[msg.sender] = 0;
        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "failed to send eth");
    }

    /////////////////////
    // Getter Functions //
    /////////////////////

    function getListing(
        address nftAddress,
        uint256 tokenId
    ) external view returns (Listing memory) {
        return nftRecords[nftAddress][tokenId];
    }

    function getProceeds(address seller) external view returns (uint256) {
        return proceed[seller];
    }
}
