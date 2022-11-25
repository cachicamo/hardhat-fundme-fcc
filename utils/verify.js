const hre = require("hardhat")
const { ethers, run, network } = require("hardhat")
require("dotenv").config()

async function verify(contractAddress, args) {
    console.log("verifying contract...")
    try {
        await run("verify:verify", {
            address: contractAddress,
            constructorArguments: args,
        })
    } catch (e) {
        if (e.message.toLowerCase().includes("already verified")) {
            log("Already verified!")
        } else {
            log(e)
        }
    }
}

module.exports = { verify }
