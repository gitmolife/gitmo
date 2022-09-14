<template>
<div class="wallet">

	<div class="_content">
		<div v-if="wallet && wallet.server.crawling" class="_keyValue crawler">
			<b>Trigger Wallet Crawler</b>
			<span><MkButton disabled><i class="fas fa-hourglass-start"></i> Crawler Running</MkButton></span>
		</div>
		<div v-else-if="wallet" class="_keyValue crawler">
			<b>Trigger Wallet Crawler</b>
			<span><MkButton error @click="crawler()"><i class="fas fa-play-circle"></i> Initialize</MkButton></span>
		</div>
	</div>

</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import MkButton from '@client/components/ui/button.vue';
import MkInput from '@client/components/ui/input.vue';
import MkSelect from '@client/components/ui/select.vue';
import * as os from '@client/os';
import * as symbols from '@client/symbols';

export default defineComponent({
	components: {
		MkButton,
		MkInput,
		MkSelect,
	},

	emits: ['info'],

	data() {
		return {
			[symbols.PAGE_INFO]: {
				title: "CryptoWallet",
				icon: 'fab fa-btc'
			},
			wallet: null,
		}
	},

	watch: {

	},

	mounted() {
		this.$emit('info', this[symbols.PAGE_INFO]);
		this.fetch();
	},

	methods: {
		async fetch() {
			await os.api('wallet/dashboard').then(wallet => {
				(this.wallet as any) = wallet;
			}).catch(e => {
				console.error(e);
			}).finally(() => {
			});
		},

		async crawler() {
			let text: string = 'Warning! This will trigger a crawl from a target height or blockhash over the wallet. User interaction may be interrupted while this takes place..';
			let res: { canceled: boolean } = await os.dialog({
				type: 'question',
				title: "Trigger Block Crawler?",
				text: text,
				showCancelButton: true,
			}) as { canceled: boolean };
			if (res.canceled) {
				return;
			}
			await os.dialog({
				type: 'question',
				title: 'Enter Block Crawler Target',
				text: 'Please enter target for Crawler start.',
				input: {
					placeholder: 'Blockhash or Height',
					type: 'string',
					required: true,
				},
			}).then(async (value: unknown) => {
				let res = value as { canceled: boolean, result: any };
				if (res.canceled) { return; }
				os.api('wallet/crawl', { hash: res.result }).then(() => {
					wallet.server.crawling = true;
				});
			});
		},
	}
});
</script>

<style lang="scss" scoped>

.wallet {
	border-top: 2px solid rgba(161, 161, 161, 0.08);
	margin-top: 10px;
	margin-right: 6px;
	margin-left: 6px;

	> ._content {
		padding-top: 2px;

		> ._keyValue {
			display: table;
			width: -webkit-fill-available;

			> b {
				width: 36%;
				display: table-cell;
			}

			> span {
				width: 64%;
				white-space: nowrap;
				display: table-cell;
			}
			> span:hover {
				opacity: 0.95;
				color: green;
			}
		}
	}
}

</style>
