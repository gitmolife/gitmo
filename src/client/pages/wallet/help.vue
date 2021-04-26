<template>
	<div>
		<MkFolder>
			<template #header><i class="fab fa-btc"></i> CryptoWallet Help</template>

			<div class="_content">
				<div class="_panel">
					<div class="help-info rowEntry">
						<dl>
							<dt>About Ohmcoin</dt>
							<dd><a href="https://ohmcoin.org/" target="_blank">Homepage</a></dd>
						</dl>
						<dl>
							<dt>Ohmcoin Listing</dt>
							<dd><a href="https://www.coingecko.com/en/coins/ohm-coin" target="_blank">Coin Listing</a></dd>
						</dl>
						<dl>
							<dt>Ohmcoin Trading</dt>
							<dd><a href="https://socialsend.net/exchange/OHMC_BTC" target="_blank">SocialSend.net Exchange</a></dd>
						</dl>
						<dl style="border-top: 1px solid rgba(160, 160, 160, 0.08); margin-top: 6px; padding-top: 2px;">
							<dt>Site Features</dt>
							<dd>
								Instance Abilities:
								<ul>
									<li>Wallet</li>
									<li>Tipping</li>
								</ul>
							</dd>
						</dl>
						<div style="margin-top: 16px; padding-top: 4px; border-top: 1px solid rgba(161, 161, 161, 0.52); font-size: 18px; font-weight: 700; text-align: center;">Wallet Usage</div>
						<dl class="divbar">
							<dt>Deposit Ohmcoin</dt>
							<dd>Send OHM from an external wallet to the site, using your <a href="/my/wallet/address/"><b>Network Deposit</b> address</a> on the site.<br/>This is located on your <a href="/my/wallet/">wallet dashboard</a> page.</dd>
						</dl>
						<dl class="divbar">
							<dt>Withdraw Ohmcoin</dt>
							<dd>Send OHM from your wallet on the site to an external wallet off the site using the <a href="/my/wallet/withdraw/"><b>Withdraw Offsite</b></a> function on the site.<br/>This is also located on your <a href="/my/wallet/">wallet dashboard</a> page.</dd>
						</dl>
						<dl class="divbar">
							<dt>Transfer Ohmcoin - Tipping</dt>
							<dd>Transfer OHM to your tipping wallet account using the <a href="/my/wallet/transfer/"><b>Interal Transfer</b></a> function on the site.<br/>This is also located on your <a href="/my/wallet/">wallet dashboard</a> page.</dd>
						</dl>
						<dl class="divbar">
							<dt>Tip Ohmcoin</dt>
							<dd>Tip OHM to another user via the tip feature on a note.</dd>
						</dl>
					</div>
				</div>
			</div>

		</MkFolder>
	</div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import MkContainer from '@client/components/ui/container.vue';
import MkFolder from '@client/components/ui/folder.vue';
import Progress from '@client/scripts/loading';
import { query as urlQuery } from '../../../prelude/url';
import * as symbols from '@client/symbols';
import * as os from '@client/os';

export default defineComponent({
	components: {
		MkContainer, MkFolder,
	},

	props: {

	},

	data() {
		return {
			[symbols.PAGE_INFO]: {
				title: 'CryptoWallet Help',
			},
		};
	},

	created() {
		this.fetch();
	},

	methods: {

		fetch() {

		},

	}

});
</script>

<style lang="scss" scoped>

.monospace {
	font-family: Lucida Console, Courier, monospace;
}

.rowEntry {
	/*border-bottom: 1px solid rgba(161, 161, 161, 0.08);*/
	padding-left: 10px;
	padding-right: 10px;
	padding-top: 8px;
	padding-bottom: 2px;
}
.rowMain {
	border-bottom: 1px solid rgba(161, 161, 161, 0.22);
	padding-top: 13px;
	padding-bottom: 5px;
}

.help-info {
	margin-bottom: 10px;
	overflow: hidden;

	> .divbar {
		border-top: 1px solid rgba(161, 161, 161, 0.20);
		padding-top: 3px;
	}

	> dl {
		display: flex;
		margin: 0;
		line-height: 1.15em;
		margin-top: 4px;
		margin-bottom: 8px;

		> dt {
				width: 30%;
				margin: 0;
		}

		> dd {
			width: 70%;
			margin: 0;
		}

		> dd {
			font-size: 0.87em;

			> a {
				font-style: italic;
				opacity: 0.80;
			}

			> ul {
				margin: 0;
			}
		}
	}
}

</style>
