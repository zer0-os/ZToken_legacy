import * as hre from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { MeowToken, ZeroToken } from "../../typechain";
import { BigNumber } from "ethers";

export const TransferType = {
  transfer: "transfer",
  transferFrom: "transferFrom",
};


export async function transfer (
  writeObject : any,
  signers: Array<SignerWithAddress>,
  amount: BigNumber,
  token : ZeroToken | MeowToken,
  transferType : string
) {
  const [
    deployer,
    userA,
    userB,
    userC
  ] = signers;

  const balancesBefore = [
    await token.balanceOf(deployer.address),
    await token.balanceOf(userA.address),
    await token.balanceOf(userB.address),
    await token.balanceOf(userC.address),
  ];

  if (transferType === TransferType.transfer) {
    await token.connect(deployer).transferBulk(
      [
        userA.address,
        userB.address,
        userC.address
      ],
      amount
    );
  } else if (transferType === TransferType.transferFrom) {
    await token.connect(deployer).approve(userA.address, hre.ethers.utils.parseEther("2"));
    await token.connect(userA).transferFromBulk(
      deployer.address,
      [
        userB.address,
        userC.address
      ],
      amount
    );
  } else {
    throw new Error("Invalid transfer type");
  }

  const balancesAfter = [
    await token.balanceOf(deployer.address),
    await token.balanceOf(userA.address),
    await token.balanceOf(userB.address),
    await token.balanceOf(userC.address),
  ];

  const type = transferType ? "transferBulk" : "transferFromBulk";
  Object.assign(writeObject, {method: type});

  for (let i = 0; i < balancesBefore.length; i++) {
    Object.assign(writeObject, {
        [`user${i}-${transferType}`]: {
          address: signers[i].address,
          balanceBeforeTransferBulk: balancesBefore[i].toString(),
          balancesAfterTransferBulk: balancesAfter[i].toString(),
        },
      }
    );
  }

  return writeObject;
}
