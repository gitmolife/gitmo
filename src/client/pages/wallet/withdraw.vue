<template>
    <div>

			<MkFolder>
				<template #header><Fa :icon="faBtc"/> CryptoWallet Transfer</template>
				<div class="contents">

					<MkContainer :body-togglable="true" class="_gap">
						<template #header><Fa :icon="faTachometerAlt"/> Wallet Withdraw - OHM</template>

						<div class="_content">
							<div class="_keyValue"><b>Current Balance</b><span class="monospace" style="font-size: 1.07em;">{{ wallet.balance }} OHM</span></div>
						</div>
						<div class="_content">
							<div class="_keyValue">
								<b><MkInput v-model:value="address"><span class="monospace">External Public Address</span></MkInput></b>
								<MkInput v-model:value="amount"><span class="monospace">Withdraw Amount</span></MkInput>
							</div>
						</div>
						<div style="width: 67%; margin: auto;">
							<MkButton full primary @click="doWithdraw()"><Fa :icon="faExternalLinkSquareAlt"/> Confirm Withdraw</MkButton>
						</div>
					</MkContainer>

		    </div>
			</MkFolder>

    </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import Progress from '@client/scripts/loading';
import { faBoxOpen, faUndo, faArrowsAlt, faBan, faBroom, faExternalLinkSquareAlt } from '@fortawesome/free-solid-svg-icons';
import { faSave } from '@fortawesome/free-regular-svg-icons';
import { query as urlQuery } from '../../../prelude/url';
import MkButton from '@client/components/ui/button.vue';
import MkInput from '@client/components/ui/input.vue';
import MkContainer from '@client/components/ui/container.vue';
import MkFolder from '@client/components/ui/folder.vue';
import * as os from '@client/os';


export default defineComponent({
  components: {
			MkButton, faSave, MkInput, MkContainer, MkFolder, Progress,
  },

  props: {

  },

  data() {
    return {
			address: "",
			amount: "",
			error: null,
      wallet: ""
    };
  },

	watch: {

	},

  created() {
    this.fetch();
  },

  methods: {

    fetch() {
      Progress.start();
      os.api('wallet/balance').then(wallet => {
        //console.log(wallet);
        this.wallet = wallet;
      }).catch(e => {
        this.error = e;
      }).finally(() => {
        Progress.done();
      });
    },

		doWithdraw() {
			let address = this.address;
			let amount = this.amount;
			Progress.start();
			os.api('wallet/withdraw', { address, amount }).then(response => {
				console.log(response);
				// TODO: handle withdraw response.
			}).catch(e => {
				this.error = e;
				console.log(e);
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

</style>
