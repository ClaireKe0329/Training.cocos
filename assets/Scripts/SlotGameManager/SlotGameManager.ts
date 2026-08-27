import { _decorator, CCInteger, Component } from 'cc';
import { SpinResultData } from '../GameData/SpinResultData';
import { SlotProcessor } from './SlotProcessor';

const { ccclass, property } = _decorator;

@ccclass( 'SlotGameManager' )
export class SlotGameManager extends Component
{
    // 遊戲開始時提供給玩家的 Balance
    @property( { type: CCInteger, min: 0 } )
    public InitialBalance: number = 1000;

    // 目前每局使用的 Bet
    @property( { type: CCInteger, min: 1 } )
    public InitialBet: number = 100;

    // 負責單一 Round 流程的 SlotProcessor
    @property( { type: SlotProcessor } )
    public SlotProcessor: SlotProcessor | null = null;

    // 玩家目前可使用的 Balance
    private _balance: number = 0;

    // 目前每局使用的 Bet
    private _bet: number = 0;

    // 最近完成一局的 Win
    private _win: number = 0;

    // 已扣除 Bet 並等待本局 Settlement
    private _isSettlementPending: boolean = false;

    protected onLoad(): void
    {
        this._balance = this.InitialBalance;
        this._bet = this.InitialBet;
    }

    public get Balance(): number
    {
        return this._balance;
    }

    public get Bet(): number
    {
        return this._bet;
    }

    public get Win(): number
    {
        return this._win;
    }

    // 目前是否正在處理單一 Round
    public get IsRoundRunning(): boolean
    {
        return this.SlotProcessor?.IsRoundRunning ?? false;
    }

    // 目前 Round 是否可以要求 Skip
    public get CanSkipRound(): boolean
    {
        return this.SlotProcessor?.CanSkipRound ?? false;
    }

    // 啟動單一 Round
    public StartRound(): boolean
    {
        if ( !this.SlotProcessor || !this.SlotProcessor.CanStartRound || this._isSettlementPending || this._balance < this._bet )
        {
            return false;
        }

        const roundBet: number = this._bet;
        const previousWin: number = this._win;
        this._win = 0;
        this._balance -= roundBet;
        this._isSettlementPending = true;

        if ( !this.SlotProcessor.StartRound( roundBet, this.completeRound.bind( this ) ) )
        {
            this._balance += roundBet;
            this._win = previousWin;
            this._isSettlementPending = false;
            return false;
        }

        return true;
    }

    // 將玩家的 Skip 操作交給目前 Round
    public SkipRound(): boolean
    {
        if ( !this.SlotProcessor )
        {
            return false;
        }

        return this.SlotProcessor.SkipRound();
    }

    // Reward 完成後使用既有 Result 執行一次本局 Settlement
    private completeRound( spinResult: SpinResultData | null ): void
    {
        if ( !this._isSettlementPending )
        {
            return;
        }

        this._isSettlementPending = false;

        if ( spinResult === null )
        {
            return;
        }

        this._win = spinResult.TotalScore;
        this._balance += this._win;
    }
}
