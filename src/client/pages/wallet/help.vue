<template>
	<div>
		<MkFolder>
			<template #header><i class="fab fa-btc"></i> CryptoWallet Overview</template>

			<div class="_content">
				<div style="font-size: 1.15em;">
					OHM Wallet Help
				</div>
				<div class="_panel">
					<ul>
						<li>Wallet</li>
						<li>Tipping</li>
						<li>Deposit</li>
						<li>Withdraw</li>
						<li>Soon...</li>
					</ul>
					<div class="help-info">
						<dl class="diff">
							<dt>OHMCoin</dt>
							<dd><a href="https://ohmcoin.org/"></a></dd>
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
import * as os from '@client/os';

export default defineComponent({
	components: {
	},

	props: {

	},

	data() {
		return {

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

.help-info {
	> dl {
		display: flex;
		margin: 0;
		line-height: 1.5em;

		> dt,
		> dd {
			width: 50%;
			margin: 0;
		}

		> dd {
			text-overflow: ellipsis;
			overflow: hidden;
			white-space: nowrap;
		}

		&.total {
			> dt,
			> dd {
				font-weight: bold;
			}
		}
	}
}

</style>
