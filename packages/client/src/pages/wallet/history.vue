<template>
		<div class="_section" v-if="history" style="margin-top: 7px; margin-bottom: 30px;">

			<MkContainer :foldable="true" :scrollable="true" style="max-height: 880px;">
				<template #header><i class="fas fa-book"></i> Wallet History - OHM</template>
				<div class="_content rowEntry" v-if="history.history">
					<MkWalletHistory :walletHistory="history.history" :confRequire="history.confRequire">
					</MkWalletHistory>
				</div>
			</MkContainer>

		</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import MkContainer from '@client/components/ui/container.vue';
import MkFolder from '@client/components/ui/folder.vue';
import Progress from '@client/scripts/loading';
import MkWalletHistory from '@client/components/wallet-history.vue';
import * as symbols from '@client/symbols';
import * as os from '@client/os';

export default defineComponent({
	components: {
		MkContainer, MkFolder, Progress,
		MkWalletHistory,
	},

	props: {

	},

	data() {
		return {
			[symbols.PAGE_INFO]: {
				title: 'CryptoWallet History',
			},
			history: { history: null, confRequire: 9, },
		};
	},

	created() {
		this.fetch();
	},

	methods: {

		async fetch() {
			Progress.start();
			await os.api('wallet/history').then(history => {
				(this.history as any) = history;
			}).catch(e => {
				// error
			}).finally(() => {
				Progress.done();
			});
		},

	}

});
</script>

<style lang="scss" scoped>

.monospace {
	font-family: Lucida Console, Courier, monospace;
}
.resp-message {
	font-family: Lucida Console, Courier, monospace;
	font-style: italic;
	font-size: 15px;
}
.address-texts {
	text-shadow: -1px 2px 7px rgba(21, 29, 33, 0.88);
	font-style: underline;
	opacity: 0.88;
}

.rowEntry {
	border-bottom: 1px solid rgba(161, 161, 161, 0.08);
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

</style>
