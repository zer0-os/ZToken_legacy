import { BigNumber, ethers } from "ethers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export interface ERC20TestOptions {
  create: () => Promise<ethers.Contract>;
  mint: (contract: ethers.Contract, to: string, amount: BigNumber) => void;
  accounts: SignerWithAddress[];
  initialSupply: BigNumber;
  decimals: number;
}

chai.use(solidity);
const { expect } = chai;

export const testERC20 = (options: ERC20TestOptions) => {
  let contract: ethers.Contract;

  const toTokens = (amount: number) => {
    const inTokens = BigNumber.from(amount).mul(
      BigNumber.from(10).pow(options.decimals)
    );
    return inTokens;
  };

  const giveTokens = async (to: string, amount: BigNumber) => {
    options.mint(contract, to, amount);
  };

  const amy = options.accounts[1];
  const bob = options.accounts[2];
  const cal = options.accounts[3];

  describe("ERC20", () => {
    describe("totalSupply()", () => {
      before(async () => {
        contract = await options.create();
      });

      it(`should have an initial total supply of ${options.initialSupply.toString()}`, async () => {
        expect(await contract.totalSupply()).to.eq(options.initialSupply);
      });

      const verifyTotalSupply = async (total: BigNumber) => {
        expect(await contract.totalSupply()).to.eq(total);
      };

      it("should return the correct total supply", async () => {
        let given = toTokens(1);
        let expected = options.initialSupply;

        await giveTokens(amy.address, given);
        expected = expected.add(given);
        await verifyTotalSupply(expected);

        given = toTokens(2);
        await giveTokens(bob.address, given);
        expected = expected.add(given);
        await verifyTotalSupply(expected);

        given = toTokens(100);
        await giveTokens(cal.address, given);
        expected = expected.add(given);
        await verifyTotalSupply(expected);
      });
    });

    describe("balanceOf(account)", () => {
      before(async () => {
        contract = await options.create();
      });

      it("should return proper balances", async () => {
        let given = toTokens(1);
        await giveTokens(amy.address, given);
        expect(await contract.balanceOf(amy.address)).to.eq(given);

        given = toTokens(3);
        await giveTokens(bob.address, given);
        expect(await contract.balanceOf(bob.address)).to.eq(given);

        given = toTokens(4);
        await giveTokens(cal.address, given);
        expect(await contract.balanceOf(cal.address)).to.eq(given);
      });
    });

    describe("allowance(account, spender)", () => {
      before(async () => {
        contract = await options.create();
      });

      it("should return the correct allowances", async () => {
        const contractAsAmy = await contract.connect(amy);
        const contractAsBob = await contract.connect(bob);

        let allowedTokens = toTokens(1);
        contractAsAmy.approve(bob.address, allowedTokens);
        expect(await contract.allowance(amy.address, bob.address)).to.eq(
          allowedTokens
        );
      });
    });
  });
};
