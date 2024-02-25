const { assert, expect } = require("chai")
const { network, deployments, ethers, getNamedAccounts } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")
const { isCallTrace } = require("hardhat/internal/hardhat-network/stack-traces/message-trace")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Nft Marketplace unit test", function () {
          let nftMarketplace, basicNft, deployer, user
          const PRICE = ethers.utils.parseEther("0.1")
          const TOKEN_ID = 0

          beforeEach(async () => {
              accounts = await ethers.getSigners() // could also do with getNamedAccounts
              deployer = accounts[0]
              user = accounts[1]
              await deployments.fixture(["all"])
              nftMarketplaceContract = await ethers.getContract("NftMarketplace")
              nftMarketplace = nftMarketplaceContract.connect(deployer)
              basicNft = await ethers.getContract("BasicNft")
              await basicNft.mintNft()
              await basicNft.approve(nftMarketplace.address, TOKEN_ID)
          })

          describe("listItem", function () {
              it("revert if msg.value is zero", async () => {
                  const ZERO_PRICE = ethers.utils.parseEther("0")
                  expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, ZERO_PRICE)
                  ).to.be.revertedWith("NftMarketplace_PriceMustBeAboveZero")
              })

              it("check user can list nft correctly", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
                  assert(listing.price.toString() == PRICE.toString())
                  assert(listing.seller.toString() == deployer.address)
              })

              it("emit a event when listed successfully", async () => {
                  expect(await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)).to.emit(
                      "listedSuccessfully"
                  )
              })
          })

          describe("buyItem", function () {
              it("revert if zero eth is send", async () => {
                  expect(nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: 0 })).to.be
                      .reverted
              })

              it("check proceed, listing and ownership transfer", async () => {
                  console.log("listing NFT......")
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  console.log("connecting to user......")
                  nftMarketplace = nftMarketplaceContract.connect(user)
                  console.log("user buying nft")
                  await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
                  console.log("get proceed...")
                  const deployerProceed = await nftMarketplace.getProceeds(deployer.address)
                  console.log("getting deleted records")
                  const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
                  console.log("getting ownership of token")
                  const newOwner = await basicNft.ownerOf(TOKEN_ID)
                  console.log("checking proceeds")
                  assert(deployerProceed.toString() == PRICE.toString())
                  console.log("checking listing")
                  assert(listing.price.toString() == "0")
                  console.log("checking user is the new owner")
                  console.log(newOwner.toString(), user.address)
                  assert(newOwner.toString() == user.address)
              })

              it("buyItem emit a ItemBought event", async () => {
                  console.log("listing NFT......")
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  console.log("connecting to user......")
                  nftMarketplace = nftMarketplaceContract.connect(user)
                  expect(
                      nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
                  ).to.emit("ItemBought")
              })
          })

          describe("cancelListing", function () {
              it("can cancel listing correctly", async () => {
                  console.log("listing NFT......")
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  console.log("canceling listing")
                  await nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
                  console.log("getting listing")
                  const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
                  console.log(listing.price)
                  assert(listing.price.toString() == "0")
              })

              it("emit a event", async () => {
                  console.log("listing NFT......")
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  console.log("canceling listing")
                  expect(await nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)).to.emit(
                      "DelistedSuccessfully"
                  )
              })
          })

          //describe("updateListing", function () {})

          describe("withdrawProceed", function () {
              it("failed if proceed is zero", async () => {
                  expect(nftMarketplace.withdrawProceed()).to.be.reverted
              })

              it("owner get proceed", async () => {
                  console.log("listing NFT......")
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  console.log("connecting to user......")
                  nftMarketplace = nftMarketplaceContract.connect(user)
                  console.log("user buying nft")
                  await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
                  console.log("getting proceed")
                  const deployerProceed = await nftMarketplace.getProceeds(deployer.address)
                  console.log("deployer balance")
                  const balanceBeforeProceed = await deployer.getBalance()
                  console.log("withdrawing eth")
                  nftMarketplace = nftMarketplaceContract.connect(deployer)
                  const txReceipt = await nftMarketplace.withdrawProceed()
                  txResponse = await txReceipt.wait(1)
                  const { gasUsed, effectiveGasPrice } = txResponse
                  const balanceAfterProceed = await deployer.getBalance()
                  const gasCost = gasUsed.mul(effectiveGasPrice)
                  console.log("assert")
                  assert(
                      balanceAfterProceed.add(gasCost).toString() ==
                          balanceBeforeProceed.add(deployerProceed).toString()
                  )
              })
          })
      })
