import { _decorator, Component } from 'cc';
import { SpinResultData } from '../GameData/SpinResultData';
import { GameConfig } from '../GameUtility/GameConfig';
import { SlotProcessor } from './SlotProcessor';

const { ccclass, property } = _decorator;

// 提供整台 Slot 的公開操作入口，並管理 Balance、Bet、Win 與 Round 結算
@ccclass( 'SlotGameManager' )
export class SlotGameManager extends Component
{
    // 負責單一 Round 流程的 SlotProcessor
    @property( { type: SlotProcessor } )
    public SlotProcessor: SlotProcessor | null = null;

    // 玩家目前可使用的 Balance
    private _balance: number = 0;

    // 目前每局使用的 Bet
    private _bet: number = 0;

    // 最近完成一局的 Win
    private _win: number = 0;

    // MainScene.onLoad 已完成 GameConfig 載入後，再初始化 Runtime Game Data
    protected start(): void
    {
        const gameConfig: GameConfig = GameConfig.GetInstance();
        this._balance = gameConfig.InitialBalance;
        this._bet = gameConfig.InitialBet;
    }

    // 提供目前 Balance 給 UI 顯示
    public get Balance(): number
    {
        return this._balance;
    }

    // 提供目前 Bet 給 UI 顯示
    public get Bet(): number
    {
        return this._bet;
    }

    // 提供最近完成一局的 Win 給 UI 顯示
    public get Win(): number
    {
        return this._win;
    }

    // 目前是否正在處理單一 Round
    public get IsRoundRunning(): boolean
    {
        return this.SlotProcessor?.IsRoundRunning ?? false;
    }

    // 目前是否可以開始新的 Round
    public get CanStartRound(): boolean
    {
        return ( this.SlotProcessor?.CanStartRound ?? false ) && this._balance >= this._bet;
    }

    // 目前 Round 是否可以要求 Skip
    public get CanSkipRound(): boolean
    {
        return this.SlotProcessor?.CanSkipRound ?? false;
    }

    // 啟動單一 Round
    public StartRound(): void
    {
        if ( !this.CanStartRound )
        {
            return;
        }

        const roundBet: number = this._bet;
        this.SlotProcessor.StartRound( roundBet, this.completeRound.bind( this ) );

        // Round 成功進入 Spinning 後才清除上一局 Win 並扣除本局 Bet
        this._win = 0;
        this._balance -= roundBet;
    }

    // 將玩家的 Skip 操作交給目前 Round
    public SkipRound(): void
    {
        if ( !this.CanSkipRound )
        {
            return;
        }

        this.SlotProcessor.SkipRound();
    }

    // Round 完成後依照 Spin Result 結算本局 Win 與 Balance
    private completeRound( spinResult: SpinResultData | null ): void
    {
        if ( spinResult === null )
        {
            return;
        }

        this._win = spinResult.TotalScore;
        this._balance += this._win;
    }
}
