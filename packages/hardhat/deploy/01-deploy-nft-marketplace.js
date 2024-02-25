const { network, ethers } = require("hardhat")
const {
    networkConfig,
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
} = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    log("Deploying NftMarketplace contract on localhost...........")
    const nftMarketPlace = await deploy("NftMarketplace", {
        from: deployer,
        aggs: [],
        log: true,
    })

    // Verify the deployment
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(basicNft.address, args)
        await verify(basicNftTwo.address, args)
    }
    log("----------------------------------------------------")
}

module.exports.tags = ["all", "nftMarketPlace"]
