const { assert, expect } = require("chai")
const { deployments, ethers, getNamedAccounts } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe", async function () {
          let fundMe, deployer, mockV3Aggregator
          // const sendValue = "1000000000000000000" // 1ETH
          const sendValue = ethers.utils.parseEther("1")
          beforeEach(async function () {
              await deployments.fixture(["all"])
              // ** another way to get accounts **
              // const accounts = await ethers.getSigners()
              // const deployer = accounts[0]
              //
              // const { deployer } = await getNamedAccounts()
              deployer = (await getNamedAccounts()).deployer

              fundMe = await ethers.getContract("FundMe", deployer)
              mockV3Aggregator = await ethers.getContract(
                  "MockV3Aggregator",
                  deployer
              )
          })
          describe("constructor", async function () {
              it("sets the aggregator addresses correctly", async function () {
                  const response = await fundMe.getPriceFeed()
                  assert.equal(response, mockV3Aggregator.address)
              })
              it("sets the owner addresses correctly", async function () {
                  const response = await fundMe.getOwner()
                  assert.equal(response, deployer)
              })
          })

          describe("fund", async function () {
              it("Fails if you don't send enough ETH", async function () {
                  await expect(fundMe.fund()).to.be.reverted
              })

              it("updated the amount founded data structure", async function () {
                  await fundMe.fund({ value: sendValue })
                  const response = await fundMe.getAddressToAmountFunded(
                      deployer
                  )
                  assert.equal(response.toString(), sendValue.toString())
              })

              it("Adds funder to array of funders", async function () {
                  await fundMe.fund({ value: sendValue })
                  const funder = await fundMe.getFunder(0)
                  assert.equal(funder, deployer)
              })

              it("adds funds if enough sent directly to contract", async function () {
                  const [, user] = await ethers.getSigners()
                  await user.sendTransaction({
                      to: fundMe.address,
                      value: ethers.utils.parseEther("1.0"), // Sends exactly 1.0 ether
                  })

                  //   const nonce = await user.getTransactionCount()
                  //   const tx = {
                  //       nonce: nonce,
                  //       gasPrice: 20000000000, // ganache value
                  //       gasLimit: 1000000,
                  //       to: fundMe.address,
                  //       value: ethers.utils.parseEther("1.0"),
                  //       data: "0x00", // use receive()
                  //       chainId: 31337,
                  //   }
                  //   const sendTXResponse = await user.sendTransaction(tx)
                  //   await sendTXResponse.wait(1)

                  const funder = await fundMe.getFunder(0)
                  assert.equal(funder, user.address)
              })

              it("adds funds if enough sent directly to contract with wrong data field", async function () {
                  const [, user] = await ethers.getSigners()
                  const nonce = await user.getTransactionCount()
                  const tx = {
                      nonce: nonce,
                      gasPrice: 20000000000, // ganache value
                      gasLimit: 1000000,
                      to: fundMe.address,
                      value: ethers.utils.parseEther("1.0"),
                      data: "0x50120012", // wrong function use fallback()
                      chainId: 31337,
                  }
                  const sendTXResponse = await user.sendTransaction(tx)
                  await sendTXResponse.wait(1)

                  const funder = await fundMe.getFunder(0)
                  assert.equal(funder, user.address)
              })
          })

          describe("withdraw", async function () {
              beforeEach(async function () {
                  await fundMe.fund({ value: sendValue })
              })

              it("withdraw ETH from a single funder", async function () {
                  // Arrange
                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address)
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)
                  // Act
                  const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait(1)

                  //        find gasCost
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  // Assert
                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(gasCost).toString()
                  )
              })

              it("allows owner to withdraw with multiple funders", async function () {
                  // Arrange
                  const accounts = await ethers.getSigners()
                  for (let index = 1; index < 6; index++) {
                      await fundMe
                          .connect(accounts[index])
                          .fund({ value: sendValue })
                      // Same as this code...
                      // const fundMeConnectedContract = await fundMe.connect(
                      //     accounts[index]
                      // )
                      // await fundMeConnectedContract.fund({ value: sendValue })
                  }
                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address)
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  // Act
                  const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait(1)

                  //        find gasCost
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  // Assert
                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(gasCost).toString()
                  )
                  //     Make sure that the funders are reset properly
                  await expect(fundMe.getFunder(0)).to.be.reverted

                  for (let i = 1; i < 6; i++) {
                      assert.equal(
                          await fundMe.getAddressToAmountFunded(
                              accounts[i].address
                          ),
                          0
                      )
                  }
              })
              it("Only allows owner to withdraw funds from contract", async function () {
                  const accounts = await ethers.getSigners()
                  const attacker = accounts[1]
                  const attackerConnectedContract = await fundMe.connect(
                      attacker
                  )
                  await expect(
                      attackerConnectedContract.withdraw()
                  ).to.be.revertedWithCustomError(
                      attackerConnectedContract,
                      "FundMe__NotOwner"
                  )
              })

              it("cheaperWithdraw single funder testing...", async function () {
                  // Arrange
                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address)
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)
                  // Act
                  const transactionResponse = await fundMe.cheaperWithdraw()
                  const transactionReceipt = await transactionResponse.wait(1)

                  //        find gasCost
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  // Assert
                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(gasCost).toString()
                  )
              })
              it("CheaperWithdraw with multiple funders testing...", async function () {
                  // Arrange
                  const accounts = await ethers.getSigners()
                  for (let index = 1; index < 6; index++) {
                      await fundMe
                          .connect(accounts[index])
                          .fund({ value: sendValue })
                      // Same as this code...
                      // const fundMeConnectedContract = await fundMe.connect(
                      //     accounts[index]
                      // )
                      // await fundMeConnectedContract.fund({ value: sendValue })
                  }
                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address)
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  // Act
                  const transactionResponse = await fundMe.cheaperWithdraw()
                  const transactionReceipt = await transactionResponse.wait(1)

                  //        find gasCost
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  // Assert
                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(gasCost).toString()
                  )
                  //     Make sure that the funders are reset properly
                  await expect(fundMe.getFunder(0)).to.be.reverted

                  for (let i = 1; i < 6; i++) {
                      assert.equal(
                          await fundMe.getAddressToAmountFunded(
                              accounts[i].address
                          ),
                          0
                      )
                  }
              })
          })
      })
